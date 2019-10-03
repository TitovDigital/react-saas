const apiUrl = window.location.hostname == 'production_hostname' ? '/api' : 'http://localhost:3000'
const dataProvider = simpleRestProvider(apiUrl, httpClient)

function App() {
  const [authenticated, setAuthenticated] = useState(null)
  
  if (authenticated === null)
    authProvider('AUTH_CHECK').then(() => {
      setAuthenticated(true)
    }).catch(() => {
      setAuthenticated(false)
    })

  return (
    <Router>
      { authenticated &&
        <Route path="/" render={(props) => <TopMenu {...props} authProvider={authProvider} setAuthenticated={setAuthenticated} /> }/>
      }
      <div className="d-flex">
        <div className="flex-grow-1">
          <Route path="/login" render={(props) => <Login {...props} authProvider={authProvider} setAuthenticated={setAuthenticated} />} />
          <Route path="/profile" render={(props) => <Profile {...props} dataProvider={dataProvider} />} />
          <Route path="/signup" render={(props) => <Signup {...props} dataProvider={dataProvider} />} />
        </div>
        { authenticated &&
          <Route path="/" render={(props) => <RightMenu {...props} authProvider={authProvider} setAuthenticated={setAuthenticated} /> }/>
        }
      </div>
    </Router>
  );
}
