import express from "express";
import { bondsReport, formatBondReport } from "./service.js";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/api", (req, res) => {
  console.log(`yo`);
  return res.send("ok");
});

app.post("/bot", async (req, res) => {
  const body = req.body;
  console.log(`message from get ${JSON.stringify(body)}`);
  if(body?.message?.text !== '/top'){
    return res.json({
      chat_id: body.message.chat.id,
      method: "sendMessage",
      text: "Уупс... не сработало :-( , попробуй команду `/top`",
    })
  }
  console.time("moex");
  const bonds = await bondsReport(58);
  console.timeEnd("moex");
  return res.json({
    chat_id: body.message.chat.id,
    method: "sendMessage",
    parse_mode: "HTML",
    text: `<pre>${formatBondReport(bonds)}</pre>`,
  });
});

app.listen(process.env.PORT, () => {
  console.log(`App listening at port ${process.env.PORT}`);
});
