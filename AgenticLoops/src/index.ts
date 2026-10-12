import { runAgent } from "./claude/agent";


runAgent(
  "Calculate 25 * 4 and find information about the result on the web in this website: www.example.com."
).then(console.log);