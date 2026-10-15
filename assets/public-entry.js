// Static directory entry files and their clean URLs represent the same page.
export function publicPath(pathname) {
  return pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
}

// Live Server opens the active editor file, which may be 404.html.
// Restrict this convenience to an explicit error-file preview on loopback hosts.
export function redirectErrorPreview(location, homeUrl) {
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) &&
      location.pathname === '/404.html') {
    location.replace(homeUrl);
    return true;
  }
  return false;
}
