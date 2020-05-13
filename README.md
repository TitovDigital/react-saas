# React.JS SaaS Architecture Kit

This document describes base architecture initially developed for
SPA back-office and SaaS applications.

Rather than a module or a blueprint, it is a set of principles
and conventions that streamline development of SPA
applications.

Based on the ideas from frameworks such as react-admin and Firebase,
however has key differences in its approach designed to address
code reuse and vendor lock-in limitations in the existing frameworks.

In its implementation it builds upon same concepts that React effects
and functional components use.

## The Core Principles

1. Separation of component look and business logic.
2. Use of standard APIs such as REST CRUD and JWT Bearer instead of
vendor-specific whenever possible.
3. Convention over dependency. Shared code that contains component
functionality should not depend on React or parts of this framework.

## Scope

* High-level Application Architecture
* Authentication
* CRUD data editing with back-end validation errors per field
* Notification alerts (flash messages)

## High-level Architecture

The top-level component is responsible for displaying application, routing
and transitioning between the 'pages' and providing data access objects
for underlying components.

See [reference example app.js](samples/app.js).

Routing functionality can be implemented with [React Router](https://reacttraining.com/react-router/web/guides/quick-start), which parses the URL and launches respective components.

Authentication state is kept in the top-level component, set during initialisation
or by child components that can change authentication state such as Login.

```js
const [authenticated, setAuthenticated] = useState(null)

if (authenticated === null)
  authProvider('AUTH_CHECK').then(() => {
    setAuthenticated(true)
  }).catch(() => {
    setAuthenticated(false)
  })

return (<Login {...props} authProvider={authProvider} setAuthenticated={setAuthenticated} />)
```

Flux isn't used intentionally to limit the dependencies
as the authentication state is the only 'global' state
that needs to be passed this way 

[`authProvider`](samples/authProvider.js) is dependent on the back-end authentication API and
the goal is to implement reusable authProviders for each of the back-end authentication interfaces.

It is implemented according to the [react-admin Authentication interface](https://marmelab.com/react-admin/Authentication.html) auth flow, however the JS interface is using strings
instead of constants to define call type to remove dependency on a third-party module.

> *This is a perfect example of all three principles.* authProvider code implements
> authentication with the back-end and session keeping in a function that doesn't define the UI
> and doesn't have hard _dependencies_ or expectations for the Component that will include it.
> This function implements _standard JWT Bearer interface_ when communicating with the back-end
> and also standardises its JS interface by a well documented _convention_.
> It also follows the _Implementation Conventions_ that listed in the bottom of this document
> to store current credentials within the session.

The top-level component is also responsible for transforming CRUD data requests from JS
components into HTTP requests to the back-end.

This reference application uses a [`simpleRestProvider`](samples/simpleRestProvider.js), which
is based on `ra-data-simple-rest` [React Admin Data Provider](https://marmelab.com/react-admin/DataProviders.html),
however the interface has been modified to remove data provider function dependency on react-admin.

[`httpClient`](data/httpClient.js) is responsible for passing active credentials in
HTTP requests, deserialising responses and converting bad responses to application-friendly errors.

It is injected into a data provider, which is then passed to child components that have
no knowledge of the back-end or authentication:

```js
const apiUrl = window.location.hostname == 'production_hostname' ? '/api' : 'http://localhost:3000'
const dataProvider = simpleRestProvider(apiUrl, httpClient)
//...
return ( <Profile dataProvider={dataProvider} /> )
```

As this application doesn't use Flux, authentication errors should be handled by components
and either result in user-friendly error message (such as when attempting to retrieve object to which
current user doesn't have access to) or redirecting to the Login page if session expires.

A back-end API often has additional logic for handling requests and a predefined format for error
messages. An example of this is [`railsHttpClient`](data/railsHttpClient.js), which is extended
version of `httpClient` that automatically includes CSRF token available in Ruby on Rails views
in requests, as well as uses a few predefined fields for errors that follow Ruby on Rails errors'
and validations' structure.

*TODO:* Implement dismissable flash notifications stored in sessionStorage?

## CRUD Editing and Forms

*TODO*

Implement AppEdit component that receives data provider and form component,
responsible for rendering forms for a resource; architect to optionally
support different components for display, edit and creation.

AppEdit, linking forms and data providers should be generic, whereas forms
tend to have different implementations that are application specific.

### Simple Forms

Trivial forms for editing an simple record with fields that can be represented as HTML5 input values
can be implemented using [uncontrolled components](https://reactjs.org/docs/uncontrolled-components.html)
along with [`resourcePage`](data/resourcePage.js) responsible for serialisation and
deserialisation of form fields.

This approach results in code significantly slimmer than controlled components but
can only be used when all field values can be stored as DOM input values.

Example:
```javascript
import { useResource, persistForm } from 'react-saas/resourcePage'
...
  const formId = 'enabledNotificationForm'
  let resourceName = 'api/properties/' + match.params.propertyId + '/enabled_notifications'
  useResource(formId, props.dataProvider, resourceName, { id: match.params.id })
  ...
  function handleSubmit(e) {
    e.preventDefault()
    persistForm(e.target, props.dataProvider, resourceName).then(() => {
      alert('added successfully')
    }).catch(err => {
      console.log(err) // TODO: create app-common exception handling
    })
  }

  return (
    <>
      <form id={formId} onSubmit={handleSubmit}>
        <input type="hidden" name="id" />
        Name: <input name="name" />
        <input type="submit" value="Save" className="btn btn-primary" />
      </form>
    </>
  )
```

## Styling of Components

*TODO:* Global stylesheets vs styled components? Where each of the styles go?

## Notifications

Use https://github.com/teodosii/react-notifications-component
or create a similar API.

See https://alligator.io/react/react-notifications-component/
for customisation example.

## Implementation Conventions

* Store state in localStorage or sessionStorage rather than cookies
* Use single quotes instead of double: https://bytearcher.com/articles/single-or-double-quotes-strings-javascript/
