// -----------------------------------------------------------------------------
// REGION | Timecard Unique Hash Generator
// -----------------------------------------------------------------------------

 // FUNCTION | Create Deterministic Timecard Auth Hash
 // ------------------------------------------------------------
 export async function Na__Timecard__CreateAuthHashAsync(payload) {
     const canonicalInput = Na__Timecard__BuildCanonicalHashInput(payload);
     const subtleDigestHash = await Na__Timecard__CreateSha256DigestHash(canonicalInput);
     if (subtleDigestHash) {
         return subtleDigestHash;
     }

     return Na__Timecard__CreateFallbackHash(canonicalInput);
 }
 // ------------------------------------------------------------


 // FUNCTION | Validate Existing Timecard Auth Hash
 // ------------------------------------------------------------
 export async function Na__Timecard__ValidateAuthHashAsync(payload, expectedHash) {
     if (!expectedHash || typeof expectedHash !== 'string') {
         return false;
     }

     const generatedHash = await Na__Timecard__CreateAuthHashAsync(payload);
     return generatedHash === expectedHash;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Build Canonical Hash Input String
 // ------------------------------------------------------------
 function Na__Timecard__BuildCanonicalHashInput(payload) {
     const monthKey = String(payload?.monthKey || '').trim();
     const rowIndex = String(payload?.rowIndex ?? '').trim();
     const dateValue = String(payload?.dateValue || '').trim();
     const clockInValue = String(payload?.clockInValue || '').trim();
     const clockOutValue = String(payload?.clockOutValue || '').trim();
     return `${monthKey}|${rowIndex}|${dateValue}|${clockInValue}|${clockOutValue}`;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Create SHA-256 Hash When Browser Supports It
 // ------------------------------------------------------------
 async function Na__Timecard__CreateSha256DigestHash(canonicalInput) {
     const hasWebCrypto = typeof window !== 'undefined'
         && window.crypto
         && window.crypto.subtle
         && typeof window.TextEncoder !== 'undefined';
     if (!hasWebCrypto) return '';

     try {
         const textEncoder = new window.TextEncoder();
         const sourceBytes = textEncoder.encode(canonicalInput);
         const digestBuffer = await window.crypto.subtle.digest('SHA-256', sourceBytes);
         const digestBytes = Array.from(new Uint8Array(digestBuffer));
         const digestHex = digestBytes.map((byteValue) => byteValue.toString(16).padStart(2, '0')).join('');
         return `sha256__${digestHex}`;
     } catch (errorValue) {
         return '';
     }
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Create Fallback Hash When Subtle API Is Missing
 // ------------------------------------------------------------
 function Na__Timecard__CreateFallbackHash(canonicalInput) {
     let hashValue = 2166136261;
     for (let indexValue = 0; indexValue < canonicalInput.length; indexValue += 1) {
         hashValue ^= canonicalInput.charCodeAt(indexValue);
         hashValue = Math.imul(hashValue, 16777619);
     }

     const unsignedValue = hashValue >>> 0;
     return `fallback__${unsignedValue.toString(16).padStart(8, '0')}`;
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
