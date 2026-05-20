exports.handler = async (event) => {
  const { email, action, name } = event.queryStringParameters || {};

  if (!email || !action) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html' },
      body: '<h2>Invalid request</h2>'
    };
  }

  const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
  const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
  const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    // Step 1: Get access token
    const tokenRes = await fetch(
      `https://${SHOPIFY_STORE}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
      }
    );

    const tokenText = await tokenRes.text();
    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch(e) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `<html><body style="font-family:Arial;padding:40px">
          <h2>🔍 Debug — Token Response</h2>
          <p><strong>Status:</strong> ${tokenRes.status}</p>
          <p><strong>Response:</strong></p>
          <pre style="background:#f5f5f5;padding:15px;overflow:auto">${tokenText.substring(0, 500)}</pre>
          <p><strong>Store:</strong> ${SHOPIFY_STORE}</p>
          <p><strong>Client ID:</strong> ${CLIENT_ID ? CLIENT_ID.substring(0,8) + '...' : 'MISSING'}</p>
          <p><strong>Secret:</strong> ${CLIENT_SECRET ? 'SET ✅' : 'MISSING ❌'}</p>
        </body></html>`
      };
    }

    if (!tokenData.access_token) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `<html><body style="font-family:Arial;padding:40px">
          <h2>🔍 Debug — No Access Token</h2>
          <pre style="background:#f5f5f5;padding:15px">${JSON.stringify(tokenData, null, 2)}</pre>
        </body></html>`
      };
    }

    const accessToken = tokenData.access_token;

    // Step 2: Find customer
    const searchRes = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/2026-04/customers/search.json?query=email:${encodeURIComponent(email)}`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const searchData = await searchRes.json();

    if (!searchData.customers || searchData.customers.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `<html><body style="font-family:Arial;text-align:center;padding:60px">
          <h2>⚠️ Customer Not Found</h2>
          <p>No account found for <strong>${email}</strong></p>
        </body></html>`
      };
    }

    const customer = searchData.customers[0];
    const currentTags = customer.tags ? customer.tags.split(', ').filter(Boolean) : [];

    if (action === 'approve') {
      const newTags = currentTags.filter(t => t !== 'zo_disapproved');
      if (!newTags.includes('zo_approved')) newTags.push('zo_approved');

      await fetch(
        `https://${SHOPIFY_STORE}/admin/api/2026-04/customers/${customer.id}.json`,
        {
          method: 'PUT',
          headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer: { id: customer.id, tags: newTags.join(', ') } })
        }
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `<html><body style="font-family:Arial;text-align:center;padding:60px">
          <div style="font-size:60px">✅</div>
          <h2>Approved!</h2>
          <p><strong>${name || email}</strong> can now purchase ZO® products.</p>
        </body></html>`
      };

    } else if (action === 'disapprove') {
      const newTags = currentTags.filter(t => t !== 'zo_approved');
      if (!newTags.includes('zo_disapproved')) newTags.push('zo_disapproved');

      await fetch(
        `https://${SHOPIFY_STORE}/admin/api/2026-04/customers/${customer.id}.json`,
        {
          method: 'PUT',
          headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer: { id: customer.id, tags: newTags.join(', ') } })
        }
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `<html><body style="font-family:Arial;text-align:center;padding:60px">
          <div style="font-size:60px">❌</div>
          <h2>Disapproved</h2>
          <p><strong>${name || email}</strong> has been disapproved.</p>
        </body></html>`
      };
    }

  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `<html><body style="font-family:Arial;padding:40px">
        <h2>❌ Catch Error</h2>
        <p>${err.message}</p>
        <pre>${err.stack}</pre>
      </body></html>`
    };
  }
};
