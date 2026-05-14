exports.handler = async (event) => {
  const { email, action, name } = event.queryStringParameters || {};

  if (!email || !action) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html' },
      body: '<h2>Invalid request</h2>'
    };
  }

  const SHOPIFY_STORE = process.env.SHOPIFY_STORE; // e.g. essentials-london.myshopify.com
  const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;  // Admin API access token

  try {
    // Step 1: Find customer by email
    const searchRes = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/2024-01/customers/search.json?query=email:${encodeURIComponent(email)}`,
      {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    const searchData = await searchRes.json();
    const customers = searchData.customers;

    if (!customers || customers.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <html><body style="font-family:Arial;text-align:center;padding:60px;max-width:500px;margin:0 auto">
            <h2>⚠️ Customer Not Found</h2>
            <p>No Shopify account found for <strong>${email}</strong></p>
            <p style="color:#777;font-size:13px">The customer must create an account on essentialslondon.com first.</p>
          </body></html>`
      };
    }

    const customer = customers[0];
    const currentTags = customer.tags ? customer.tags.split(', ').filter(Boolean) : [];

    if (action === 'approve') {
      // Add zo_approved tag
      if (!currentTags.includes('zo_approved')) {
        currentTags.push('zo_approved');
      }
      // Remove zo_disapproved if exists
      const newTags = currentTags.filter(t => t !== 'zo_disapproved');

      await fetch(
        `https://${SHOPIFY_STORE}/admin/api/2024-01/customers/${customer.id}.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ customer: { id: customer.id, tags: [...newTags, 'zo_approved'].join(', ') } })
        }
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <html><body style="font-family:Arial;text-align:center;padding:60px;max-width:500px;margin:0 auto">
            <div style="font-size:60px;margin-bottom:20px">✅</div>
            <h2 style="color:#000">Approved!</h2>
            <p><strong>${name || email}</strong> has been approved for ZO® products.</p>
            <p style="color:#777;font-size:13px">Tag <code>zo_approved</code> has been added to their Shopify account.<br/>They can now purchase ZO® products on essentialslondon.com.</p>
            <div style="margin-top:30px;padding:15px;background:#f9f9f9;border:1px solid #eee;font-size:13px">
              <strong>Customer:</strong> ${name}<br/>
              <strong>Email:</strong> ${email}<br/>
              <strong>Shopify ID:</strong> ${customer.id}
            </div>
          </body></html>`
      };

    } else if (action === 'disapprove') {
      // Remove zo_approved, add zo_disapproved
      const newTags = currentTags.filter(t => t !== 'zo_approved');
      if (!newTags.includes('zo_disapproved')) {
        newTags.push('zo_disapproved');
      }

      await fetch(
        `https://${SHOPIFY_STORE}/admin/api/2024-01/customers/${customer.id}.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ customer: { id: customer.id, tags: newTags.join(', ') } })
        }
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <html><body style="font-family:Arial;text-align:center;padding:60px;max-width:500px;margin:0 auto">
            <div style="font-size:60px;margin-bottom:20px">❌</div>
            <h2 style="color:#c0392b">Disapproved</h2>
            <p><strong>${name || email}</strong> has been disapproved for ZO® products.</p>
            <p style="color:#777;font-size:13px">Tag <code>zo_disapproved</code> has been added to their Shopify account.<br/>They will not be able to purchase ZO® products.</p>
            <div style="margin-top:30px;padding:15px;background:#f9f9f9;border:1px solid #eee;font-size:13px">
              <strong>Customer:</strong> ${name}<br/>
              <strong>Email:</strong> ${email}<br/>
              <strong>Shopify ID:</strong> ${customer.id}
            </div>
          </body></html>`
      };
    }

  } catch (err) {
    console.error('Shopify error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `<html><body style="font-family:Arial;text-align:center;padding:60px"><h2>❌ Error</h2><p>${err.message}</p></body></html>`
    };
  }
};
