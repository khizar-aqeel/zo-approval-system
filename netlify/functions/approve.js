exports.handler = async (event) => {
  const { email } = event.queryStringParameters || {};

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ approved: false })
    };
  }

  const NETLIFY_TOKEN = process.env.NETLIFY_API_TOKEN;
  const SITE_ID = process.env.NETLIFY_SITE_ID;

  try {
    const res = await fetch(
      `https://api.netlify.com/api/v1/blobs/${SITE_ID}/zo-approved/${encodeURIComponent(email)}`,
      {
        headers: { 'Authorization': `Bearer ${NETLIFY_TOKEN}` }
      }
    );

    if (res.ok) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://essentialslondon.com'
        },
        body: JSON.stringify({ approved: true })
      };
    } else {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://essentialslondon.com'
        },
        body: JSON.stringify({ approved: false })
      };
    }
  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: false, error: err.message })
    };
  }
};
