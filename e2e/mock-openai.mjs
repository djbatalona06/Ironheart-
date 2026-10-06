// Minimal stand-in for the OpenAI Responses API (streaming + JSON) so /api/ai can be tested offline.
import http from "node:http";

export const calls = [];
export function startMockOpenAI(port = 4010) {
  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    const body = JSON.parse(raw || "{}");
    calls.push(body);
    const usage = { input_tokens: 10, output_tokens: 5, total_tokens: 15 };
    if (body.stream) {
      res.writeHead(200, { "content-type": "text/event-stream" });
      let seq = 0;
      const send = (ev) => res.write(`event: ${ev.type}\ndata: ${JSON.stringify({ ...ev, sequence_number: seq++ })}\n\n`);
      for (const delta of ["Bench is ", "trending up. ", "No deload needed."]) {
        send({ type: "response.output_text.delta", item_id: "m1", output_index: 0, content_index: 0, delta });
      }
      send({ type: "response.completed", response: { id: "r1", object: "response", status: "completed", output: [], usage } });
      return res.end();
    }
    const text = JSON.stringify({ items: [{ name: "Egg", serving_size: "2 large", calories: 143, protein_g: 12.6, carbs_g: 0.7, fat_g: 9.5 }] });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      id: "r2", object: "response", status: "completed", model: body.model, usage,
      output: [{ type: "message", id: "m2", role: "assistant", status: "completed", content: [{ type: "output_text", text, annotations: [] }] }],
    }));
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}
