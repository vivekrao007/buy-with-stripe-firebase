const functions = require("firebase-functions");
const express = require("express");
const bodyParser = require("body-parser");

const cors = require("cors")({ origin: true });
const app = express();
app.use(bodyParser.json());

const stripe = require("stripe")(functions.config().stripe.token);
const { v4: uuidV4 } = require("uuid");

// method to create stripe customer and charge for payment.
function makePayment(req, res) {
  // capturing json payload from request
  const data = req.body;
  // destructing required parameters from request body
  const { token, amount } = data;
  // converting stripe decimal number to actual amount.
  const finalAmount = amount * 100;
  // generating unique idempotency key for avoiding duplicate charges.
  const idempotencyKey = uuidV4();
  return stripe.customers
    .create({
      email: token.email,
      source: token.id,
    })
    .then((customer) => {
      stripe.charges
        .create(
          {
            amount: finalAmount,
            currency: "usd",
            customer: customer.id,
            receipt_email: token.email,
            description: "a test acc",
            shipping: {
              name: token.card.name,
              address: {
                line1: token.card.address_line1,
                line2: token.card.address_line2,
                city: token.card.address_city,
                country: token.card.address_country,
                postal_code: token.card.address_zip,
              },
            },
          },
          { idempotencyKey }
        )
        .then((result) => {
          return res.status(200).json(result);
        })
        .catch((err) => {
          res.status(400).json(err);
        });
      return;
    });
}

app.use(cors);
app.post("/api/makepayment", makePayment);

// creating firebase function for makePayment
exports.makePayment = functions.https.onRequest(makePayment);
