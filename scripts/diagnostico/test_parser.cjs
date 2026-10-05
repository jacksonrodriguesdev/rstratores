const fs = require("fs");
const text = fs.readFileSync("dados/redeparts_api_dump2.json", "utf8");
const data = JSON.parse(text);
const mainCall = data.find((c) => c.url.includes("fc2cfd2545ac52d5"));
const bodyStr = mainCall.text;
const body = JSON.parse(bodyStr);

function findHits(obj) {
  if (Array.isArray(obj)) {
    for (let item of obj) {
      const res = findHits(item);
      if (res) return res;
    }
  } else if (obj !== null && typeof obj === "object") {
    if (obj.k && obj.k.includes("code") && obj.k.includes("slug")) {
      return obj.v;
    }
    for (let key in obj) {
      const res = findHits(obj[key]);
      if (res) return res;
    }
  }
  return null;
}

const hitsArray = findHits(body);
if (hitsArray) {
  hitsArray.forEach((hit) => {
    if (Array.isArray(hit.v)) {
      const code = hit.v[0]?.s;
      const slug = hit.v[1]?.s;
      const desc = hit.v[2]?.s;
      const brand = hit.v[3]?.s;
      const cat = hit.v[4]?.s;
      console.log(`- ${code} | ${desc} | ${brand} | ${cat}`);
    }
  });
} else {
  console.log("Hits not found");
}
