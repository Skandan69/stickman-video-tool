// ---------- AI Video generation panel (client side) ----------
// Talks ONLY to our own /api/generate-video endpoint (js side never sees/holds the Replicate API
// token — that lives server-side only, see api/generate-video.js). This is a genuinely separate
// generation path from the rest of the app: the stickman elsewhere is drawn deterministically by our
// own canvas code, but this panel asks an external AI model (Kling Video 3.0, via Replicate) to
// generate brand-new video pixels from a text prompt and an optional style/character reference image.
// Real money is spent by the site owner on every successful generation, so this is clearly labeled as
// an opt-in, "this costs us money" feature rather than something wired into the free timeline/export
// flow.

(function () {
  let refImageDataUrl = null; // base64 data: URI of the uploaded style/character reference image, if any
  let pollTimer = null;
  let pollAttempts = 0;
  const MAX_POLL_ATTEMPTS = 150; // ~10 minutes at 4s intervals

  function $(id) { return document.getElementById(id); }

  function setStatus(text, isError) {
    const el = $('aiVideoStatus');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = isError ? '#b3261e' : 'var(--muted, #666)';
  }

  function setBusy(busy) {
    const btn = $('aiVideoGenerateBtn');
    if (btn) {
      btn.disabled = busy;
      btn.textContent = busy ? 'Generating…' : 'Generate AI Video';
    }
  }

  function renderResult(videoUrl) {
    const box = $('aiVideoResult');
    if (!box) return;
    box.innerHTML = '';
    const video = document.createElement('video');
    video.src = videoUrl;
    video.controls = true;
    video.style.maxWidth = '100%';
    video.style.borderRadius = '8px';
    box.appendChild(video);
    const link = document.createElement('a');
    link.href = videoUrl;
    link.textContent = 'Download video';
    link.target = '_blank';
    link.rel = 'noopener';
    link.style.display = 'inline-block';
    link.style.marginTop = '8px';
    link.style.fontSize = '13px';
    box.appendChild(document.createElement('br'));
    box.appendChild(link);
  }

  function stopPolling() {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
    pollAttempts = 0;
  }

  async function pollStatus(id) {
    pollAttempts++;
    if (pollAttempts > MAX_POLL_ATTEMPTS) {
      setStatus('Still processing after a while — this can happen with longer clips. Come back and check again shortly.', false);
      setBusy(false);
      return;
    }
    try {
      const res = await fetch('/api/generate-video?id=' + encodeURIComponent(id));
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || 'Something went wrong shecking the generation.', true);
        setBusy(false);
        stopPolling();
        return;
      }
      if (data.status === 'succeeded' && data.output) {
        setStatus('Done!', false);
        setBusy(false);
        renderResult(data.output);
        stopPolling();
        return;
      }
      if (data.status === 'failed' || data.status === 'canceled') {
        setStatus('Generation ' + data.status + (data.error ? ': ' + data.error : '') + '.', true);
        setBusy(false);
        stopPolling();
        return;
      }
      setStatus('Status: ' + (data.status || 'processing') + '… (this can take a few minutes)', false);
      pollTimer = setTimeout(() => pollStatus(id), 4000);
    } catch (err) {
      setStatus('Lost connection while checking status — will keep retrying.', true);
      pollTimer = setTimeout(() => pollStatus(id), 6000);
    }
  }

  async function onGenerateClick() {
    const promptEl = $('aiVideoPrompt');
    const prompt = promptEl ? promptEl.value.trim() : '';
    if (!prompt) {
      setStatus('Describe the video you want first.', true);
      return;
    }
    stopPolling();
    $('aiVideoResult') && ($('aiVideoResult').innerHTML = '');
    setBusy(true);
    setStatus('Starting generation…', false);

    const durationEl = $('aiVideoDuration');
    const modeEl = $('aiVideoMode');
    const aspectEl = $('aiVideoAspect');
    const audioEl = $('aiVideoAudio');
    const negEl = $('aiVideoNegative');

    const payload = {
      prompt,
      duration: durationEl ? Number(durationEl.value) : 5,
      mode: modeEl ? modeEl.value : 'standard',
      aspect_ratio: aspectEl ? aspectEl.value : '16:9',
      generate_audio: audioEl ? !!audioEl.checked : false,
      negative_prompt: negEl ? negEl.value.trim() : ''
    };
    if (refImageDataUrl) payload.start_image = refImageDataUrl;

    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || 'Could not start generation.', true);
        setBusy(false);
        return;
      }
      setStatus('Status: ' + (data.status || 'starting') + '… (this can take a few minutes)', false);
      pollStatus(data.id);
    } catch (err) {
      setStatus('Could not reach the server — check your connection and try again.', true);
      setBusy(false);
    }
  }

  function onRefImageChange(e) {
    const file = e.target.files && e.target.files[0];
    const preview = $('aiVideoRefPreview');
    if (!file) { refImageDataUrl = null; if (preview) preview.style.display = 'none'; return; }
    const reader = new FileReader();
    reader.onload = () => {
      refImageDataUrl = reader.result;
      if (preview) {
        preview.src = refImageDataUrl;
        preview.style.display = 'inline-block';
      }
    };
    reader.readAsDataURL(file);
  }

  function init() {
    const btn = $('aiVideoGenerateBtn');
    if (btn) btn.addEventListener('click', onGenerateClick);
    const refInput = $('aiVideoRefImage');
    if (refInput) refInput.addEventListener('change', onRefImageChange);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
