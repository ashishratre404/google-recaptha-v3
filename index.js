const axios = require("axios");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const sgMail = require("@sendgrid/mail");
const emailExistence = require("email-existence");

const app = express();
const router = express.Router();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
dotenv.config();

const verifyRecaptchaV3 = async (token, secretKey) => {
  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: secretKey,
          response: token,
        },
      }
    );
    console.log("res.data", response.data);
    return response.data.score >= 0.5 && response.data.success;
  } catch (error) {
    console.error(error);
    return false;
  }
};

router.post("/validate-recaptcha", async (req, res) => {
  const { token, name, email, organisation, phone } = req.body;

  // Check if email exists
  emailExistence.check(email, async (error, exists) => {
    if (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (!exists) {
      console.log("email not exist");
      res.status(400).json({ emailError: "Email does not exist" });
      return;
    }

    const isTokenValid = await verifyRecaptchaV3(token, process.env.SECRET_KEY);
    if (isTokenValid) {
      console.log("yes");

      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: "ashish.ratre@tealindia.in",
        from: "no_reply@tealindia.in",
        subject: "Demo Request",
        text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nOrganization: ${organisation}`,
        html: `
        <table>
          <tr>
            <td><strong>Name:</strong></td>
            <td>${name}</td>
          </tr>
          <tr>
            <td><strong>Email:</strong></td>
            <td>${email}</td>
          </tr>
          <tr>
            <td><strong>Organisation:</strong></td>
            <td>${organisation}</td>
          </tr>
          <tr>
            <td><strong>Phone:</strong></td>
            <td>${phone}</td>
          </tr>
        </table>
      `,
      };

      sgMail
        .send(msg)
        .then(() => console.log("Email sent"))
        .catch((error) => console.log(error));
    } else {
      console.log("No");
    }

    res.json({ success: isTokenValid });
  });
});

app.use(express.json());
app.use("/", router);

app.listen(process.env.PORT, () => {
  console.log("server is up and running..");
});
