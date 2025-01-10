function generatePrefix(prefix) {
  let combinedString;
  const timestamp = Math.floor(Date.now() / 1000);

  if (prefix !== 'eko') {
    combinedString = prefix + timestamp;
    if (combinedString.length > 21) {
      combinedString = combinedString.substring(0, 21);
    }
  } else {
    combinedString = prefix + timestamp;
    if (combinedString.length > 16) {
      combinedString = prefix + timestamp.substring(0, 16 - prefix.length);
    }
  }
  return combinedString;
}

  export default generatePrefix;