module.exports = (url, options = {}) => {
  if (!options.headers) {
    options.headers = new Headers({ Accept: 'application/json' });
  }
  const token = localStorage.getItem('authToken');
  if (token)
    options.headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, options).then(response => {
    if (response.ok) {
      const contentType = response.headers.get('content-type')
      if (response.status === 201) {
        return { headers: response.headers, json: {} }
      } else if (contentType && contentType.indexOf('application/json') !== -1) {
        return response.json().then(json => { return { headers: response.headers, json: json } })
      } else {
        return response.text().then(text => { return { headers: response.headers, json: { message: text } } })
      }
    } else {
      return response.text().then(text => {
        throw new Error(`${response.status}: ${text}`)
      })
    }
  })
}
