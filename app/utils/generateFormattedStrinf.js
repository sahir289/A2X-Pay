function generatePrefix(user_id) {
    const prefix = 'eko';
    let combinedString = prefix + user_id;
    if (combinedString.length > 16) {
      combinedString = prefix + user_id.substring(0, 16 - prefix.length);
    }
    return combinedString;
  }

  export default generatePrefix;