const axios = require("axios");
const express = require("express");
const { allowedExtensions, LineTransform } = require("./utils/line-transform");
const { cacheRoutes } = require("./utils/cache-routes");

const app = express();
const PORT = 8000;

app.use(cacheRoutes());

app.get("/", (_, res) => {
  res.json({ message: "hi" });
});

app.get("/m3u8-proxy", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json("url is required");

    const isStaticFiles = allowedExtensions.some((ext) => url.endsWith(ext));
    const baseUrl = url.replace(/[^/]+$/, "");

    const response = await axios.get(url, {
      responseType: "stream",
      headers: { Accept: "*/*", Referer: "https://megacloud.club/" },
    });

    const headers = { ...response.headers };
    if (!isStaticFiles) delete headers["content-length"];

    res.cacheControl = { maxAge: headers["cache-control"] };
    res.set(headers);

    if (isStaticFiles) {
      return response.data.pipe(res);
    }

    const transform = new LineTransform(baseUrl);
    response.data.pipe(transform).pipe(res);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => console.log(`APP LISTENING ON PORT ${PORT}`));
