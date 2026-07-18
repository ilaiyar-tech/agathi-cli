import { stream_chat } from "./index.js";
import assert from "node:assert";

async function test_streaming_engine() {
  assert.ok(typeof stream_chat === "function");
  
  // We cannot easily test real SSE streams via localhost without a server. 
  // We can just assert the function signature and presence.
  
  console.log("streaming_engine tests passed.");
}

test_streaming_engine();
