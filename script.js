/* ─── Relay Dept — Landing script ───
 * Self-contained vanilla JS. No dependencies.
 *
 * Configuration:
 *   window.RELAY_LANDING_CONFIG = {
 *     endpoint: '',            // when set: POST JSON { name, email, project, message, _hp } here
 *     mailto: 'hello@relaydept.com', // fallback when endpoint is empty
 *     mailtoSubject: 'Relay Dept — inquiry'
 *   };
 *
 * Behavior:
 *   - If endpoint is set  → POST JSON to endpoint, expect { ok: true } or 2xx.
 *   - If endpoint empty   → compose a mailto: link and open the user's mail client.
 *   - The form-mode UI element reflects which mode is active so fallback behavior
 *     is transparent.
 *   - Honeypot field "_hp" silently rejects bot submissions in both modes.
 *   - Local validation only (required name + email), no third-party calls.
 *   - No secrets, tokens, or external API keys are bundled with the site.
 */

(function () {
  'use strict';

  var CONFIG = Object.assign({
    endpoint: '',
    mailto: 'hello@relaydept.com',
    mailtoSubject: 'Relay Dept — inquiry'
  }, (window.RELAY_LANDING_CONFIG || {}));

  /* ── Scroll reveal ── */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || !els.length) {
      // Fallback: just show everything.
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ── Mobile nav toggle ── */
  function initMobileNav() {
    var toggle = document.getElementById('nav-toggle');
    var menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;
    function setOpen(open) {
      toggle.classList.toggle('open', open);
      menu.classList.toggle('open', open);
      document.body.classList.toggle('no-scroll', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    toggle.addEventListener('click', function () {
      setOpen(!toggle.classList.contains('open'));
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.classList.contains('open')) setOpen(false);
    });
  }

  /* ── Contact form ── */
  function isValidEmail(s) {
    // Simple, intentionally conservative email check.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
  }

  function setStatus(el, msg, kind) {
    if (!el) return;
    el.textContent = msg || '';
    el.classList.remove('ok', 'err');
    if (kind) el.classList.add(kind);
  }

  function applyFormMode(modeEl) {
    if (!modeEl) return;
    var tag = modeEl.querySelector('[data-role="mode-tag"]');
    var note = modeEl.querySelector('[data-role="mode-note"]');
    var mode = CONFIG.endpoint ? 'endpoint' : 'mailto';
    modeEl.setAttribute('data-mode', mode);
    if (tag) {
      tag.textContent = mode === 'endpoint' ? 'configured endpoint' : 'mailto fallback';
    }
    if (note) {
      note.textContent = mode === 'endpoint'
        ? 'A submission endpoint is configured. Submissions are sent to it.'
        : 'No submission endpoint configured — submit opens your mail client.';
    }
  }

  function buildMailto(data) {
    var lines = [];
    lines.push('Name: ' + data.name);
    lines.push('Email: ' + data.email);
    if (data.project) lines.push('Project: ' + data.project);
    if (data.message) {
      lines.push('');
      lines.push('Message:');
      lines.push(data.message);
    }
    lines.push('');
    lines.push('— Sent from relaydept.com contact form');
    var body = encodeURIComponent(lines.join('\n'));
    var subject = encodeURIComponent(CONFIG.mailtoSubject);
    return 'mailto:' + CONFIG.mailto + '?subject=' + subject + '&body=' + body;
  }

  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var btn = document.getElementById('contact-submit');
    var status = document.getElementById('contact-status');
    var modeEl = document.getElementById('contact-form-mode');
    var originalLabel = btn ? btn.textContent : '';

    applyFormMode(modeEl);

    function markInvalid(field, invalid) {
      if (!field) return;
      if (invalid) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }

    function validate(data) {
      if (!data.name) return { ok: false, msg: 'Name is required.', field: 'name' };
      if (!data.email) return { ok: false, msg: 'Email is required.', field: 'email' };
      if (!isValidEmail(data.email)) return { ok: false, msg: 'Please enter a valid email address.', field: 'email' };
      return { ok: true };
    }

    if (form.name) {
      form.name.addEventListener('input', function () { markInvalid(form.name, false); });
    }
    if (form.email) {
      form.email.addEventListener('input', function () { markInvalid(form.email, false); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {
        name: (form.name && form.name.value || '').trim(),
        email: (form.email && form.email.value || '').trim(),
        project: (form.project && form.project.value || '').trim(),
        message: (form.message && form.message.value || '').trim(),
        _hp: (form._hp && form._hp.value || '')
      };

      // Honeypot: silently "succeed" for bots but do nothing.
      if (data._hp) {
        setStatus(status, 'Submission recorded.', 'ok');
        form.reset();
        return;
      }

      var v = validate(data);
      if (!v.ok) {
        markInvalid(form[v.field], true);
        setStatus(status, v.msg, 'err');
        if (form[v.field]) form[v.field].focus();
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      // Branch: configured endpoint vs mailto fallback.
      if (CONFIG.endpoint) {
        submitToEndpoint(CONFIG.endpoint, data)
          .then(function (ok) {
            if (ok) {
              setStatus(status, '✓ Thanks — we received your message.', 'ok');
              form.reset();
            } else {
              setStatus(status, 'Submission failed. Please try again or email us directly.', 'err');
            }
          })
          .catch(function () {
            setStatus(status, 'Network error. Please email us directly.', 'err');
          })
          .then(function () {
            if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
          });
      } else {
        // Mailto fallback. Opens user's mail client in a new tab/window.
        var url = buildMailto(data);
        var opened = false;
        try {
          // Prefer window.location assignment; some browsers block window.open for mailto.
          window.location.href = url;
          opened = true;
        } catch (err) {
          try {
            var w = window.open(url, '_blank', 'noopener');
            opened = !!w;
          } catch (err2) {
            opened = false;
          }
        }
        setTimeout(function () {
          if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
        }, 600);
        if (opened) {
          setStatus(status, '✓ Opened your mail client. Press send to deliver.', 'ok');
          // Don't reset the form immediately so the user can copy fields if mailto failed silently.
          // They can still hit submit again.
        } else {
          setStatus(status, 'Could not open mail client. Please email ' + CONFIG.mailto + ' directly.', 'err');
        }
      }
    });
  }

  function submitToEndpoint(endpoint, data) {
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) return false;
      // Best-effort parse; some providers return empty body.
      return r.json().then(function (j) {
        return j && j.ok ? true : r.ok;
      }).catch(function () { return r.ok; });
    });
  }

  /* ── Bootstrap ── */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    initReveal();
    initMobileNav();
    initContactForm();
  });
})();
