module.exports = (url, options = {}) => {
  if (!options.headers) {
    options.headers = new Headers({ Accept: 'application/json' });
  }
  options.headers.append('X-CSRF-Token', document.head.querySelector('meta[name="csrf-token"]').content)
  return fetch(url, options).then(response => {
    const contentType = response.headers.get('content-type')
    // 204 No Content response will not have content-type
    const isJson = contentType ? contentType.indexOf('application/json') !== -1 : null
    if (response.ok) {
      if (response.status === 201 || response.status === 204) {
        return { headers: response.headers, json: {} }
      } else if (isJson) {
        return response.json().then(json => { return { headers: response.headers, json: json } })
      } else {
        console.log('Unexpected response status and content-type combination: ' + response.status + ' / ' + contentType)
      }
    } else {
      if (isJson) {
        return response.json().then(json => {
          const err = new Error(json.title)
          err.messages = json.messages
          err.full_messages = json.full_messages
          err.status = response.status
          throw err
        })
      } else {
        return response.text().then(text => {
          const err = new Error(text)
          err.status = response.status
          throw err
        })
      }
    }
  })
}
