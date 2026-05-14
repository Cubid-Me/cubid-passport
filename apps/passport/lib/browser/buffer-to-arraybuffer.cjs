function bufferToArrayBuffer(buffer) {
  if (buffer.buffer instanceof ArrayBuffer && typeof buffer.buffer.slice === "function") {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  }

  const arrayBuffer = new ArrayBuffer(buffer.length)
  const view = new Uint8Array(arrayBuffer)
  for (let index = 0; index < buffer.length; index += 1) {
    view[index] = buffer[index]
  }
  return arrayBuffer
}

module.exports = bufferToArrayBuffer
module.exports.bufferToArrayBuffer = bufferToArrayBuffer
