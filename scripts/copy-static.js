const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

function copy(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);
fs.copyFileSync(path.join(root, "index.html"), path.join(dist, "index.html"));
copy(path.join(root, "css"), path.join(dist, "css"));
copy(path.join(root, "js"), path.join(dist, "js"));

console.log("Built static site into dist/");
