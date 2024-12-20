function generatePrefix(user_id, prefix) {
  let combinedString;

  if (prefix !== 'eko') {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    combinedString = prefix + timestamp;
    if (combinedString.length > 21) {
      combinedString = combinedString.substring(0, 21);
    }
  } else {
    combinedString = prefix + user_id;
    if (combinedString.length > 16) {
      combinedString = prefix + user_id.substring(0, 16 - prefix.length);
    }
  }
  return combinedString;
}

  export default generatePrefix;