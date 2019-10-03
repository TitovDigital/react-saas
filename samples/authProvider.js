var jwtDecode = require('jwt-decode');

const AUTH_API = window.location.hostname == 'production_url' ? '/api/users/' : 'http://localhost:3000/users/'

export default async (type, params) => {
  switch (type) {
    case 'AUTH_LOGIN':
      return fetch(AUTH_API + 'login', {
        method: 'POST',
        body: JSON.stringify(params),
        headers: { 'Content-type': 'application/json' },
      }).then(async (response) => {
        const responseText = await response.text()
        if (response.ok) {
          localStorage.setItem('authToken', responseText)
        } else {
          return Promise.reject(responseText)
        }
      })
    case 'AUTH_LOGOUT':
      localStorage.removeItem('authToken')
      return Promise.resolve()
    case 'AUTH_CHECK':
      const token = localStorage.getItem('authToken')
      const currentTime = (new Date().getTime()) / 1000
      if (!token || jwtDecode(token).exp < currentTime)
        return Promise.reject()
      return Promise.resolve()  
    default:
      return Promise.resolve()
  }
}
