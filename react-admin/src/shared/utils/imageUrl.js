// handle absolute and relative URLs for chat images

export const getChatImageUrl = (path) => {
  if (!path) {
    return null;
  }
  
  // Convert to string and decode any HTML entities
  let pathStr = String(path).trim();
  
  // Decode HTML entities if present
  const textarea = document.createElement('textarea');
  textarea.innerHTML = pathStr;
  pathStr = textarea.value;
  
  // If already absolute URL, return as is
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
    return pathStr;
  }
  
  // Ensure path starts with /
  const normalizedPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
  
  // Build absolute URL - use simple concatenation to avoid encoding
  const port = window.location.port;
  const host = window.location.hostname;
  
  // For localhost with port 8080
  if (port) {
    return `http://${host}:${port}${normalizedPath}`;
  }
  
  return `${window.location.protocol}//${host}${normalizedPath}`;
};
