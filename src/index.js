const express = require('express');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/api", (req, res) => {
    var ip = req.headers['x-forwarded-for']
    console.log(`Request from ${ip}`);
    return res.send("Hello!");
});

app.listen(process.env.PORT, () => {
    console.log(`App listening at port ${process.env.PORT}`);
});