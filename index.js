import amqp from "amqplib";
import Ably from 'ably';
import axios from 'axios';
import figlet from 'figlet';

const url = 'amqps://HKx6dw.e3Icdw:jkBIoji6u84OS6CHfiiPHFfOcHjJcydTSsqs50IiCVI@us-east-1-a-queue.ably.io/shared';
const ably = new Ably.Realtime('wx4sNQ.gLYtJg:5FhBJjeC9wGYfNDTZiIznwEbZNP32FTayD0EQ0R9ZlQ');

let connection, channel;

async function createChannel(conn) {
  console.log('Creating channel...');
  const ch = await conn.createChannel();
  ch.on('close', async () => {
    console.log('Channel closed, reconnecting...');
    await connectToQueue();
  });
  console.log('Channel created successfully');
  return ch;
}

async function generateImage(image_request) {
  let data = JSON.stringify({
    "data": [
      image_request.prompt,
      image_request.width || 1920,
      image_request.height || 1080,
      12,
      2,
      -1,
      null,
      0,
      true
    ]
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'http://localhost:7860/gradio_api/call/generate_image',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  };

  console.log('Sending job generation request...');
  const response = await axios.request(config);
  console.log('Initial image generation request successful:', JSON.stringify(response.data));
  return response.data;
}

async function getImageMeta(event_id) {
  console.log('Sending image meta request...');
  const response = await axios.get("http://localhost:7860/gradio_api/call/generate_image/" + event_id.trim());
  console.log('Second generate image request successful');
  return response.data;
}

async function downloadImage(parsedUrl) {
  console.log('Downloading image from parsed URL...');
  const image = await axios.get(parsedUrl.replace("gradio_a/", ""), { responseType: 'arraybuffer' });
  console.log('Image downloaded successfully');
  return image.data;
}

async function uploadImage(imageData) {
  const uploadParams = {
    method: 'PUT',
    url: `https://magickai-image-storage.botable.workers.dev/PIXE3/${Date.now()}_magick_image.webp`,
    headers: {
      'Content-Type': 'image/webp',
      'Authorization': 'Bearer L9ile3DdbQIK3CauWD4Ej1znrytinKzzrz481jyD'
    },
    data: imageData
  };
  console.log('Uploading image to Cloudflare bucket...');
  const uploadResponse = await axios(uploadParams);
  console.log('Cloudflare upload successful -', uploadResponse.status);
  return uploadResponse.data;
}

async function upscaleImage(imageUrl) {
  const upscaleParams = {
    method: 'POST',
    url: 'https://flows.mpvt.io/webhook-test/image/upscale',
    headers: {
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({ url: imageUrl, scale: 2 })
  };
  console.log('Upscaling image...');
  const upscaleResponse = await axios(upscaleParams);
  console.log('Image upscaled successfully -', upscaleResponse.data);
  return upscaleResponse.data.url;
}

async function processMessage(message) {
  var image_request = message.data;
  console.log('Received image request:', image_request);

  try {
    const result = await generateImage(image_request);
    const responseData = await getImageMeta(result.event_id);
    const urlMatch = responseData.match(/"url":\s*"([^"]+)"/);
    const parsedUrl = urlMatch ? urlMatch[1] : null;
    console.log('Parsed URL:', parsedUrl);

    const imageData = await downloadImage(parsedUrl);
    const imageUrl = await uploadImage(imageData);

    const upscaledImageUrl = await upscaleImage(imageUrl);

    if (image_request.sessionId === 'API') {
      console.log('Posting message back to callback URL...');
      await axios.post(image_request.callback, { imageUrl: upscaledImageUrl });
      console.log('Callback POST request successful');
    } else {
      const channel = ably.channels.get(image_request.sessionId);
      console.log('Sending Ably message to user session...');
      await channel.publish("imageGenerated", { text: `<img src="${upscaledImageUrl}" width=500 />` });
      console.log('Ably message sent successfully');
    }

    return true;
  } catch (error) {
    console.error('Error processing message:', error);
    return false;
  }
}

async function connectToQueue() {
  console.log('Connecting to AMQP server...');
  try {
    connection = await amqp.connect(url);
    console.log('Connected to AMQP server');

    connection.on('close', async () => {
      console.log('Connection closed, reconnecting...');
      await connectToQueue();
    });

    connection.on('error', async (err) => {
      console.error('Connection error:', err);
      await connectToQueue();
    });

    channel = await createChannel(connection);
    console.log('Consuming messages from queue...');
    await channel.consume('HKx6dw:ImageRequests', async (item) => {
      console.log('Message received from queue');
      let decodedEnvelope;
      try {
        decodedEnvelope = JSON.parse(item.content);
        console.log('Message content parsed successfully');
      } catch (err) {
        console.error('Error parsing message content:', err);
        await channel.nack(item, false, false); // Discard the message
        return;
      }

      let messages;
      try {
        messages = await Ably.Realtime.Message.fromEncodedArray(decodedEnvelope.messages || []);
        console.log('Ably messages decoded successfully');
      } catch (err) {
        console.error('Error decoding Ably messages:', err);
        await channel.nack(item, false, false); // Discard the message
        return;
      }

      console.log('Processing messages...');
      for (let message of messages) {
        console.log('Processing message:', message.data);
        const success = await processMessage(message);
        if (success) {
          console.log('Acknowledging message...');
          await channel.ack(item);
        } else {
          await channel.nack(item, false, false); // Discard the message
        }
      }
    });
  } catch (err) {
    console.error('Error in connectToQueue function:', err);
    setTimeout(connectToQueue, 5000); // Retry after 5 seconds
  }
}

async function closeConnection() {
  try {
    if (channel) {
      console.log('Closing channel...');
      await channel.close();
      console.log('Channel closed');
    }
    if (connection) {
      console.log('Closing connection...');
      await connection.close();
      console.log('Connection closed');
    }
  } catch (err) {
    console.error('Error closing connection or channel:', err);
  }
}

async function main() {
  console.log(figlet.textSync('Magick AI', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  }));
  console.log('Magick Render Server');
  try {
    await connectToQueue();
    process.on('SIGINT', closeConnection);
    process.on('SIGTERM', closeConnection);
  } catch (err) {
    console.error('Error in main function:', err);
    setTimeout(main, 5000); // Retry main function after 5 seconds
  }
}

main();