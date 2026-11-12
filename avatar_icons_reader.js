(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  document.getElementById("vsp-panel")?.remove();
  const panel = document.createElement("div");
  panel.id = "vsp-panel";
  panel.style.cssText = "position:fixed;right:16px;top:16px;z-index:999999;width:380px;background:#1e1f24;color:#eee;font:13px/1.45 system-ui,sans-serif;border:1px solid #555;border-radius:8px;padding:12px";
  panel.innerHTML = "<b>Avatar icon saver</b><div id='vsp-s' style='margin-top:8px'>Starting…</div>";
  document.body.appendChild(panel);
  const say = t => (panel.querySelector("#vsp-s").textContent = t);
  const T = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const html = await (await fetch("/wiki/List_of_Avatars", { credentials: "include" })).text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const urls = [...new Set([...doc.querySelectorAll("#mw-content-text table.container-pkmn img")].map(i => i.getAttribute("src")).filter(Boolean))];
  const enc = new TextEncoder();
  const parts = [], central = [];
  let off = 0, done = 0, failed = 0;
  const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const u of urls) {
    say(`Saving ${++done} / ${urls.length}`);
    try {
      const r = await fetch(u, { credentials: "include" });
      if (!r.ok) throw 0;
      const data = new Uint8Array(await r.arrayBuffer());
      const name = enc.encode(u.split("/").pop());
      const c = crc(data);
      const lh = new Uint8Array([0x50, 0x4b, 3, 4, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(c), ...u32(data.length), ...u32(data.length), ...u16(name.length), 0, 0]);
      parts.push(lh, name, data);
      central.push(new Uint8Array([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(c), ...u32(data.length), ...u32(data.length), ...u16(name.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(off)]), name);
      off += lh.length + name.length + data.length;
    } catch (e) { failed++; }
    if (done % 20 === 0) await sleep(100);
  }
  const cdStart = off;
  let cdSize = 0;
  central.forEach(p => (cdSize += p.length));
  const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(central.length / 2), ...u16(central.length / 2), ...u32(cdSize), ...u32(cdStart), 0, 0]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([...parts, ...central, end], { type: "application/zip" }));
  a.download = "avatar-icons.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  say(`Done: ${urls.length - failed} saved, ${failed} failed. Check your downloads for avatar-icons.zip`);
})();
