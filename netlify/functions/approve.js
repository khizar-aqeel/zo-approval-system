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
  const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

  // GraphQL helper
  async function shopifyGraphQL(query, variables = {}) {
    const res = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/2026-04/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, variables })
      }
    );
    return res.json();
  }

  try {
    // Step 1: Find customer by email
    const searchResult = await shopifyGraphQL(`
      query getCustomer($query: String!) {
        customers(first: 1, query: $query) {
          edges {
            node {
              id
              email
              tags
            }
          }
        }
      }
    `, { query: `email:${email}` });

    const edges = searchResult?.data?.customers?.edges;

    if (!edges || edges.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <html><body style="font-family:Arial;text-align:center;padding:60px;max-width:500px;margin:0 auto">
            <h2>⚠️ Customer Not Found</h2>
            <p>No Shopify account found for <strong>${email}</strong></p>
            <p style="color:#777;font-size:13px">The customer must create an account on essentialslondon.com first.</p>
            ${searchResult?.errors ? `<p style="color:red;font-size:11px">API Error: ${JSON.stringify(searchResult.errors)}</p>` : ''}
          </body></html>`
      };
    }

    const customer = edges[0].node;
    const currentTags = customer.tags || [];

    if (action === 'approve') {
      const newTags = currentTags.filter(t => t !== 'zo_disapproved');
      if (!newTags.includes('zo_approved')) {
        newTags.push('zo_approved');
      }

      await shopifyGraphQL(`
        mutation updateCustomer($input: CustomerInput!) {
          customerUpdate(input: $input) {
            customer {
              id
              tags
            }
            userErrors {
              field
              message
            }
          }
        }
      `, { input: { id: customer.id, tags: newTags } });

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
              <strong>Email:</strong> ${email}
            </div>
          </body></html>`
      };

    } else if (action === 'disapprove') {
      const newTags = currentTags.filter(t => t !== 'zo_approved');
      if (!newTags.includes('zo_disapproved')) {
        newTags.push('zo_disapproved');
      }

      await shopifyGraphQL(`
        mutation updateCustomer($input: CustomerInput!) {
          customerUpdate(input: $input) {
            customer {
              id
              tags
            }
            userErrors {
              field
              message
            }
          }
        }
      `, { input: { id: customer.id, tags: newTags } });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <html><body style="font-family:Arial;text-align:center;padding:60px;max-width:500px;margin:0 auto">
            <div style="font-size:60px;margin-bottom:20px">❌</div>
            <h2 style="color:#c0392b">Disapproved</h2>
            <p><strong>${name || email}</strong> has been disapproved for ZO® products.</p>
            <p style="color:#777;font-size:13px">Tag <code>zo_disapproved</code> has been added to their Shopify account.</p>
            <div style="margin-top:30px;padding:15px;background:#f9f9f9;border:1px solid #eee;font-size:13px">
              <strong>Customer:</strong> ${name}<br/>
              <strong>Email:</strong> ${email}
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
