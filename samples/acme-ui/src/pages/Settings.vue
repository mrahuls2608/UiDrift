<template>
  <section class="settings">
    <h2 class="settings-title">Settings</h2>
    <label for="email">Email</label>
    <input id="email" class="field" />
    <button class="save-button">Save changes</button>
    <a href="/help" class="help-link"></a>
  </section>
</template>

<style scoped>
.settings-title { font-size: 28px; color: #1f2937; font-weight: 600; }
.field { padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 999px; background: #f8fafc; }
.save-button { background: #0ea5e9; color: #fff; padding: 9px 18px; border-radius: 8px; font-size: 15px; }
.help-link { color: #3b82f6; font-size: 13px; }
</style>
