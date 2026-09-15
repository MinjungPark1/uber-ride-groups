(() => {
  const TOTAL_CENTS = 4703;
  const FRIENDS = ["Maya", "Jordan"];
  const STORAGE_KEY = "ride-groups-class-demo-v2";
  const leadScreen = document.getElementById("lead-screen");
  const riderScreen = document.getElementById("rider-screen");
  const tabs = document.getElementById("rider-tabs");
  const replay = document.getElementById("replay-control");
  const note = document.getElementById("demo-note");
  const riderLabel = document.getElementById("rider-label");

  const initial = () => ({
    stage: "draft",
    selected: [...FRIENDS],
    responses: { Maya: "none", Jordan: "none" },
    payments: { Alex: "none", Maya: "none", Jordan: "none" },
    rider: "Maya",
    notice: "Start by sending invitations from Alex’s checkout."
  });

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && ["draft", "invited", "requested", "completed"].includes(saved.stage)
        && Array.isArray(saved.selected) && saved.selected.every(name => FRIENDS.includes(name))
        && FRIENDS.includes(saved.rider) && saved.responses && saved.payments) return saved;
    } catch (_) { /* Storage can be unavailable in a private browser session. */ }
    return initial();
  }
  let state = restore();
  let rideTimer = null;
  const money = cents => `$${(cents / 100).toFixed(2)}`;

  function shares() {
    const members = ["Alex", ...FRIENDS.filter(name => state.selected.includes(name))];
    const base = Math.floor(TOTAL_CENTS / members.length);
    const remainder = TOTAL_CENTS % members.length;
    return Object.fromEntries(members.map((name, index) => [name, base + (index < remainder ? 1 : 0)]));
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* The demo still works in memory. */ }
  }

  const route = `<div class="route-box"><div><i aria-hidden="true"></i>Downtown pickup</div><div><i aria-hidden="true"></i>Concert Hall</div></div>`;
  const ride = `<div class="ride-card"><div><strong>UberX</strong><small>Sample group ride</small></div><b>${money(TOTAL_CENTS)}</b></div>`;

  function split() {
    const allocation = shares();
    return `<div class="split-box">${Object.entries(allocation).map(([name, cents]) =>
      `<div class="split-row"><span>${name}${name === "Alex" ? " <small>(you)</small>" : ""}</span><strong>${money(cents)}</strong></div>`).join("")}</div>`;
  }

  function statusTag(status) {
    const labels = { none: "Not invited", ready: "Your share", pending: "Pending", approved: "Approved", declined: "Declined", expired: "Expired", paid: "Charged", failed: "Charge failed" };
    return `<span class="status-tag ${status}">${labels[status] || status}</span>`;
  }

  function leadHTML() {
    if (state.stage === "draft") {
      return `<div class="screen-kicker">ALEX · CHECKOUT</div><h3 class="screen-title">Ride with friends</h3>${route}${ride}
        <div class="section-mini">People you follow</div>
        ${FRIENDS.map(name => `<label class="person-check"><input type="checkbox" data-person="${name}" ${state.selected.includes(name) ? "checked" : ""}><span>${name}</span><small>Followed account</small></label>`).join("")}
        <div class="section-mini">Review exact allocations</div>${split()}
        <p class="screen-help">Every selected friend must approve their own amount. Your share is ${money(shares().Alex)}. No ride is requested yet.</p>
        <button class="screen-button" data-action="send" ${state.selected.length ? "" : "disabled"}>Send checkout invitations</button>
        ${state.selected.length ? "" : `<p class="error-text">Choose at least one friend to use Ride Groups.</p>`}`;
    }
    if (state.stage === "invited") {
      const allApproved = state.selected.length > 0 && state.selected.every(name => state.responses[name] === "approved");
      const blocked = state.selected.some(name => ["declined", "expired"].includes(state.responses[name]));
      const expired = state.selected.filter(name => state.responses[name] === "expired");
      return `<div class="screen-kicker">ALEX · GROUP CHECKOUT</div><h3 class="screen-title">${allApproved ? "Everyone approved" : blocked ? "Group needs attention" : "Waiting for friends"}</h3>${route}${ride}
        <div class="section-mini">Exact allocations</div>${split()}
        <ul class="status-list"><li><span>Alex · ${money(shares().Alex)}</span>${statusTag("ready")}</li>${state.selected.map(name => `<li><span>${name} · ${money(shares()[name])}</span>${statusTag(state.responses[name])}</li>`).join("")}</ul>
        <button class="screen-button" data-action="request" ${allApproved ? "" : "disabled"}>Request vehicle</button>
        ${allApproved ? `<p class="screen-help">By requesting, Alex confirms their own ${money(shares().Alex)} allocation. Charges occur after this simulated ride.</p>` : `<p class="screen-help">A vehicle can be requested only after every selected rider approves.</p>`}
        ${expired.length ? `<button class="screen-button secondary" data-action="retry-expired">Retry expired invitation${expired.length > 1 ? "s" : ""}</button>` : ""}
        ${blocked ? `<button class="screen-button secondary" data-action="revise">Revise group and amounts</button>` : ""}`;
    }
    if (state.stage === "requested") {
      return `<div class="screen-kicker">ALEX · RIDE REQUESTED</div><h3 class="screen-title">Your group is on its way.</h3>${route}${ride}
        <div class="result-box"><h4>All selected riders approved</h4><p>The vehicle request is simulated. No charges have happened yet.</p></div>
        <div class="section-mini">Approved amounts</div>${split()}
        <p class="screen-help">This sample ride will finish shortly. Individual simulated charges happen afterward.</p>`;
    }
    const allocation = shares();
    const failed = Object.entries(state.payments).filter(([name, payment]) => name !== "Alex" && state.selected.includes(name) && payment === "failed");
    return `<div class="screen-kicker">ALEX · RIDE COMPLETE</div><h3 class="screen-title">The ride is finished.</h3>${ride}
      <div class="section-mini">Individual charge results</div>
      <ul class="status-list">${Object.entries(allocation).map(([name, cents]) => `<li><span>${name} · ${money(cents)}</span>${statusTag(state.payments[name])}</li>`).join("")}</ul>
      <p class="screen-help">${failed.length ? `${failed.map(([name]) => name).join(" and ")} still ${failed.length === 1 ? "owes" : "owe"} only ${failed.length === 1 ? "their" : "their own"} allocation. Alex is not charged for another rider’s failed share.` : "Each account was charged only its own approved allocation in this simulation."}</p>`;
  }

  function riderHTML() {
    const name = state.rider;
    if (!state.selected.includes(name)) {
      return `<div class="screen-kicker">${name.toUpperCase()} · ACCOUNT</div><h3 class="screen-title">No group invitation</h3><p class="screen-help">${name} is not included in Alex’s current checkout.</p>`;
    }
    if (state.stage === "draft") {
      return `<div class="screen-kicker">${name.toUpperCase()} · ACCOUNT</div><h3 class="screen-title">No invitation yet.</h3>${route}<p class="screen-help">Alex is reviewing the group and exact amounts before sending invitations.</p>`;
    }
    const amount = money(shares()[name]);
    const response = state.responses[name];
    if (state.stage === "invited") {
      if (response === "pending") {
        return `<div class="screen-kicker">${name.toUpperCase()} · INVITATION</div><h3 class="screen-title">Alex invited you.</h3>${route}
          <div class="invite-box"><span class="amount-label">YOUR EXACT ALLOCATION</span><div class="amount">${amount}</div><span class="amount-label">Sample ride total ${money(TOTAL_CENTS)}</span><p class="approval-copy">Authorize only your own ${amount} payable to Uber if the ride proceeds. The charge is simulated after the ride.</p></div>
          <div class="rider-choice"><button class="screen-button" data-action="approve">Authorize ${amount}</button><button class="screen-button secondary" data-action="decline">Decline</button></div>
          <p class="screen-help">Alex cannot request the vehicle until every selected rider authorizes.</p>`;
      }
      if (response === "approved") {
        return `<div class="screen-kicker">${name.toUpperCase()} · INVITATION</div><h3 class="screen-title">You approved ${amount}.</h3>${route}<div class="result-box"><h4>Your share is authorized</h4><p>Alex is waiting for the remaining approvals before requesting the ride.</p></div><p class="screen-help">A changed allocation would require you to approve again.</p>`;
      }
      return `<div class="screen-kicker">${name.toUpperCase()} · INVITATION</div><h3 class="screen-title">${response === "expired" ? "Invitation expired." : "You declined."}</h3>${route}<p class="screen-help">${response === "expired" ? "Alex may resend this same allocation. You are not included until you authorize." : "Alex must revise the group before a ride can be requested. No share moves to someone else automatically."}</p>`;
    }
    if (state.stage === "requested") {
      return `<div class="screen-kicker">${name.toUpperCase()} · RIDE REQUESTED</div><h3 class="screen-title">Your ride is on its way.</h3>${route}<div class="invite-box"><span class="amount-label">YOUR APPROVED ALLOCATION</span><div class="amount">${amount}</div><p class="approval-copy">The simulated charge will happen after the ride completes.</p></div>`;
    }
    const failed = state.payments[name] === "failed";
    return `<div class="screen-kicker">${name.toUpperCase()} · RIDE COMPLETE</div><h3 class="screen-title">${failed ? "Your charge needs a retry." : "Your share is complete."}</h3>${route}
      <div class="invite-box"><span class="amount-label">YOUR APPROVED ALLOCATION</span><div class="amount">${amount}</div>${statusTag(state.payments[name])}<p class="approval-copy">${failed ? "Your share remains yours; the organizer is not charged instead." : "Only your approved amount was charged in this simulation."}</p></div>`;
  }

  function riderTabsHTML() {
    return `<div class="rider-switch">${FRIENDS.map(name => `<button data-action="switch" data-person="${name}" aria-pressed="${state.rider === name}">${name}</button>`).join("")}</div>`;
  }

  function scheduleRideEnd() {
    if (state.stage !== "requested" || rideTimer !== null) return;
    rideTimer = setTimeout(() => {
      rideTimer = null;
      if (state.stage === "requested") act("complete");
    }, 4000);
  }

  function render() {
    leadScreen.innerHTML = leadHTML();
    riderScreen.innerHTML = riderHTML();
    tabs.innerHTML = riderTabsHTML();
    replay.hidden = state.stage !== "completed";
    riderLabel.textContent = state.rider;
    note.textContent = state.notice;
    persist();
    scheduleRideEnd();
  }

  function act(action, person) {
    if (action === "reset") { if (rideTimer !== null) clearTimeout(rideTimer); rideTimer = null; state = initial(); return render(); }
    if (action === "switch" && FRIENDS.includes(person)) { state.rider = person; state.notice = `Viewing ${person}’s account.`; return render(); }
    if (action === "send" && state.stage === "draft" && state.selected.length) {
      state.stage = "invited";
      for (const name of FRIENDS) state.responses[name] = state.selected.includes(name) ? "pending" : "none";
      state.notice = "Invitations sent. Switch to each selected rider and authorize their exact share.";
    } else if (action === "approve" && state.stage === "invited" && state.responses[state.rider] === "pending") {
      state.responses[state.rider] = "approved";
      state.notice = `${state.rider} authorized ${money(shares()[state.rider])}.`;
    } else if (action === "decline" && state.stage === "invited" && state.responses[state.rider] === "pending") {
      state.responses[state.rider] = "declined";
      state.notice = `${state.rider} declined. Alex must explicitly revise the group; no unpaid amount transfers automatically.`;
    } else if (action === "expire" && state.stage === "invited" && state.responses[person] === "pending") {
      state.responses[person] = "expired";
      state.notice = `${person}’s invitation expired. Alex may retry the same amount or revise the group.`;
    } else if (action === "retry-expired" && state.stage === "invited") {
      for (const name of state.selected) if (state.responses[name] === "expired") state.responses[name] = "pending";
      state.notice = "Expired invitations resent for the same exact amounts. Existing approvals remain valid.";
    } else if (action === "revise" && state.stage === "invited") {
      state.stage = "draft";
      for (const name of FRIENDS) state.responses[name] = "none";
      state.notice = "Alex is reviewing the group again. Prior approvals are cleared; any new allocation needs fresh authorization.";
    } else if (action === "request" && state.stage === "invited" && state.selected.length && state.selected.every(name => state.responses[name] === "approved")) {
      state.stage = "requested";
      state.notice = "Alex requested the simulated vehicle after every selected rider authorized.";
    } else if (["complete", "complete-failed"].includes(action) && state.stage === "requested") {
      state.stage = "completed";
      state.payments = { Alex: "paid", Maya: "none", Jordan: "none" };
      for (const name of state.selected) state.payments[name] = action === "complete-failed" && person === name ? "failed" : "paid";
      state.notice = action === "complete" ? "Ride complete. Individual simulated charges succeeded." : `${person}’s own simulated charge failed; Alex’s amount did not change.`;
    } else if (action === "retry-charge" && state.stage === "completed" && state.payments[person] === "failed") {
      state.payments[person] = "paid";
      state.notice = `${person}’s own simulated charge succeeded on retry.`;
    } else return;
    render();
  }

  [leadScreen, riderScreen, tabs, replay].forEach(container => {
    container.addEventListener("click", event => {
      const target = event.target.closest("button[data-action]");
      if (target && container.contains(target)) act(target.dataset.action, target.dataset.person);
    });
  });
  leadScreen.addEventListener("change", event => {
    const input = event.target.closest("input[data-person]");
    if (!input || state.stage !== "draft") return;
    state.selected = FRIENDS.filter(name => {
      const checkbox = leadScreen.querySelector(`input[data-person="${name}"]`);
      return checkbox && checkbox.checked;
    });
    state.notice = state.selected.length ? "Review the updated exact amounts, then send fresh invitations." : "Select at least one friend to make a group.";
    render();
  });
  render();
})();
