// =============================================================================
// VALEVISION3D - EMAIL WORKERS - ADDRESS BOOK DECRYPTOR (CLIENT-SIDE)
// =============================================================================
//
// FILE       : Na__Feature__EmailWorkers__AddressBook__Decryptor__.js
// NAMESPACE  : Na__Feature__EmailWorkers
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Fetch encrypted address book from CDN and decrypt client-side
// CREATED    : 09-Apr-2026
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Base64 Decode Helper
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Decode Base64 String to Uint8Array
    // ------------------------------------------------------------
    function Na__Feature__EmailWorkers__Base64ToBytes(base64Value) {
        const binary = atob(String(base64Value || ''));
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fetch and Decrypt
// -----------------------------------------------------------------------------

    // FUNCTION | Fetch Encrypted Address Book from CDN and Decrypt
    // ------------------------------------------------------------
    async function Na__Feature__EmailWorkers__FetchAndDecryptContacts(cdnUrl, keyB64) {
        const response = await fetch(cdnUrl, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Address book fetch failed: ${response.status}`);
        }

        const encryptedPayload = await response.json();
        const ivBytes          = Na__Feature__EmailWorkers__Base64ToBytes(encryptedPayload.iv);
        const cipherBytes      = Na__Feature__EmailWorkers__Base64ToBytes(encryptedPayload.ciphertext);
        const keyBytes         = Na__Feature__EmailWorkers__Base64ToBytes(keyB64);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivBytes },
            cryptoKey,
            cipherBytes
        );

        const decodedText = new TextDecoder().decode(new Uint8Array(decryptedBuffer));
        const parsedJson  = JSON.parse(decodedText);
        const rawContacts = Array.isArray(parsedJson?.contacts) ? parsedJson.contacts : [];

        return rawContacts
            .map((item, index) => ({
                id    : String(index + 1),
                name  : String(item?.name || '').trim(),
                email : String(item?.email || '').trim().toLowerCase()
            }))
            .filter((item) => Boolean(item.email));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__Feature__EmailWorkers__FetchAndDecryptContacts };

// endregion -------------------------------------------------------------------
