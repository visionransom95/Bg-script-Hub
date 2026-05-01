async function testList() {
  const res = await fetch('http://localhost:3000/api/files');
  const data = await res.json();
  console.log("Files length:", data.length, data.map(d => d.originalName));
}
testList();
