async function testKey() {
  const key = "AIzaSyCAEyZn_IONVZyhgg92UPg2FJ-mArtZHVM";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Hi" }] }]
    })
  });
  
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

testKey();
