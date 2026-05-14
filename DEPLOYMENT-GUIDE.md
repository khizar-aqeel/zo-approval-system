# ZO® Approval System — Deployment Guide
## Essentials London

---

## What This System Does

1. Customer fills ZO consultation form on your Netlify page
2. You receive a detailed email at shop@essentialslondon.com
3. Email has APPROVE / DISAPPROVE buttons
4. You click Approve → customer gets `zo_approved` tag in Shopify automatically
5. Customer can now buy ZO products on your store

---

## STEP 1 — Upload to GitHub

1. Go to https://github.com and create a free account (if you don't have one)
2. Click "New Repository" → Name: `zo-approval-system` → Create
3. Upload all files from the `zo-approval-system` folder you received

---

## STEP 2 — Deploy to Netlify

1. Go to https://netlify.com → Sign up free (use GitHub login)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect GitHub → Select `zo-approval-system` repo
4. Build settings: leave as default
5. Click **Deploy site**
6. Your site will get a URL like: `https://amazing-name-123.netlify.app`
7. **Copy this URL** — you'll need it

---

## STEP 3 — Set Environment Variables in Netlify

Go to: **Site Settings → Environment Variables → Add variable**

Add these one by one:

| Key | Value |
|-----|-------|
| `SHOPIFY_STORE` | `essentials-london.myshopify.com` |
| `SHOPIFY_TOKEN` | Your Shopify API token (from ZO Approval System app) |
| `ADMIN_EMAIL` | `shop@essentialslondon.com` |
| `SMTP_HOST` | `smtp.gmail.com` (or your email provider) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your sending email address |
| `SMTP_PASS` | Your email app password |

After adding all variables → **Trigger redeploy** (Deploys tab → Trigger deploy)

### Getting Gmail App Password:
1. Go to myaccount.google.com
2. Security → 2-Step Verification (enable if not already)
3. Security → App passwords → Select "Mail" → Generate
4. Copy the 16-character password → use as SMTP_PASS

---

## STEP 4 — Add Form Page to Shopify

1. Shopify Admin → **Online Store → Pages → Add page**
2. Title: `ZO Consultation Form`
3. Click `<>` (HTML source) in the editor
4. Paste this iframe code:

```html
<iframe 
  src="https://YOUR-NETLIFY-URL.netlify.app" 
  width="100%" 
  height="2200px" 
  frameborder="0" 
  scrolling="auto"
  style="border:none;">
</iframe>
```

Replace `YOUR-NETLIFY-URL` with your actual Netlify URL.

5. Save the page
6. Page URL will be: `essentialslondon.com/pages/zo-consultation-form`

---

## STEP 5 — Edit Shopify Theme (Vogal)

This makes the Add to Cart button show "Login to Purchase" or "Complete Form" based on customer status.

1. Shopify Admin → Online Store → Themes → **Edit code**
2. Find file: `sections/main-product.liquid`
3. Press Ctrl+F and search for: `type="submit" name="add"`
4. Find the entire `<button>` block (it starts with `<button` and ends with `</button>`)
5. Replace ONLY that button block with:

```liquid
{% if customer %}
  {% if customer.tags contains 'zo_approved' %}
    <button type="submit" name="add"
      class="{{ button_class }}"
      {% unless current_variant.available %}disabled{% endunless %}>
      {% unless current_variant.available %}
        {{ 'products.product.sold_out' | t }}
      {% else %}
        {{ 'products.product.add_to_cart' | t }}
      {% endunless %}
    </button>
  {% else %}
    <a href="/pages/zo-consultation-form" 
       style="display:block;width:100%;padding:15px;background:#000;color:#fff;text-align:center;text-decoration:none;font-weight:600;letter-spacing:1px;text-transform:uppercase;font-size:14px;">
      Complete ZO® Form to Purchase
    </a>
  {% endif %}
{% else %}
  <a href="/account/login?return_url={{ request.path | url_encode }}" 
     style="display:block;width:100%;padding:15px;background:#000;color:#fff;text-align:center;text-decoration:none;font-weight:600;letter-spacing:1px;text-transform:uppercase;font-size:14px;">
    Login to Purchase
  </a>
{% endif %}
```

6. Save

---

## STEP 6 — Apply Only to ZO Collection

To show the custom button ONLY on ZO products (not all products):

Wrap the button code above with a collection check:

```liquid
{% assign is_zo = false %}
{% for collection in product.collections %}
  {% if collection.handle == 'zo-skin-health' %}
    {% assign is_zo = true %}
  {% endif %}
{% endfor %}

{% if is_zo %}
  <!-- paste the login/form/approve button code here -->
{% else %}
  <!-- original add to cart button here -->
{% endif %}
```

Replace `zo-skin-health` with your actual ZO collection handle (found in Shopify → Collections → ZO collection → URL).

---

## How Approval Works (Daily Use)

1. Customer creates account on essentialslondon.com
2. Customer goes to ZO product page → sees "Login to Purchase"
3. They log in → see "Complete ZO® Form to Purchase"
4. They fill the form → you get email at shop@essentialslondon.com
5. You click **APPROVE** in the email
6. Customer immediately can add ZO products to cart ✅

---

## Troubleshooting

**Email not arriving?**
- Check spam folder
- Verify SMTP settings in Netlify environment variables
- Redeploy after changing env vars

**Approve button gives "Customer Not Found"?**
- Customer hasn't created a Shopify account yet
- Their form email doesn't match their Shopify account email

**Button not changing on product page?**
- Clear browser cache
- Check collection handle matches exactly
- Make sure customer is logged in

---

## Support

For technical issues, contact your developer with this guide.
