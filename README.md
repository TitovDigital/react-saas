# React.JS SaaS Patterns

This document describes best patterns for developing
SPA back-office and SaaS applications.

Rather than a module or a blueprint, it is a set of principles
and conventions that streamline development of SPA
applications.

## The Core Principles

1. Separation of component view and data without using heavyweight
Flux/Redux approach.
2. Use of standard APIs such as REST CRUD and JWT Bearer instead of
vendor-specific whenever possible.
3. Convention over dependency. Shared code that contains component
functionality should not depend on React or parts of this framework.

## Scope

* High-level Application Architecture
* Authentication
* CRUD data editing with back-end validation errors per field
* Notification pop-ups (flash messages)

## High-level Architecture

The top-level component is responsible for displaying application, routing
and transitioning between the 'pages' and providing data access objects
for underlying components.

See [reference example app.js](samples/app.js).

Routing functionality can be implemented with [React Router](https://reacttraining.com/react-router/web/guides/quick-start),
which parses the URL and launches respective components.

Singleton pattern is the preferred method of keeping global state.
Blueprint.js [Toaster component](https://blueprintjs.com/docs/#core/components/toast)
is an example of how it works.

Another acceptable alternative of keeping global state is to rely on the
main component and inject it into children. This practice should be used
cautiously as it makes component calls unnecessarily verbose.

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

> In most cases with REST APIs `httpClient` should be used directly without a data provider level,
> unless application requirements include being able to switch between various APIs. For non-REST
> API a vendor JS SDK library is preferred to the custom implementation.
>
> Alternatively, a client application
> may implement models using ActiveRecord pattern to provide an API-agnostic layer for data access.
> This is most useful when a single model may have data coming from several back-end services.

[`httpClient`](data/httpClient.js) is responsible for passing active credentials in
HTTP requests, deserialising responses and converting bad responses to application-friendly errors.

It is injected into a data provider, which is then passed to child components that have
no knowledge of the back-end or authentication:

```js
const apiUrl = window.location.hostname === 'production_hostname' ? '/api' : 'http://localhost:3000'
const dataProvider = simpleRestProvider(apiUrl, httpClient)
//...
return ( <Profile dataProvider={dataProvider} /> )
```

As this application doesn't use Flux/Redux, authentication errors should be handled by components
and either result in user-friendly error message (such as when attempting to retrieve object to which
current user doesn't have access to) or redirecting to the Login page if session expires.

A back-end API often has additional logic for handling requests and a predefined format for error
messages. An example of this is [`railsHttpClient`](data/railsHttpClient.js), which is an extended
version of `httpClient` that automatically includes CSRF token available in Ruby on Rails views
in requests, as well as uses a few predefined fields for errors that follow Ruby on Rails errors'
and validations' structure.

Embedding back-end processing logic into a `httpClient` implementation allows to handle
responses within application UI in a uniform manner. For example, a form page may
defer saving result to a centrally defined functions that display both positive
and negative result to the user.

```js
function handleSubmit() {
  persistData(resource, dataProvider, resourceName).then(() => {
    displayPersistResult(persisted)
    history.push('../')
  }).catch(handlePersistError)
}
```

As we know format of the response in case of an error, a function to process
it needs to only be defined once. In this case error is formatted depending
on details available from the application and displayed using a singleton
Blueprint.js Toaster.

```js
const handlePersistError = e => {
  if (e.full_messages && e.full_messages.length > 0)
    AppToaster.show({ message: e.full_messages.join(";\n"), intent: Intent.DANGER })
  else
    AppToaster.show({ message: e.message, intent: Intent.DANGER })
}
```

## CRUD Editing and Forms

*TODO*

Implement AppEdit component that receives data provider and form component,
responsible for rendering forms for a resource; architect to optionally
support different components for display, edit and creation.

AppEdit, linking forms and data providers should be generic, whereas forms
tend to have different implementations that are application specific.

### Uncontrolled Forms

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

### Controlled Forms

More advanced scenarios and use of children components such as a date selector
usually require to keep local state and use controlled components.
When it is the case, state updates should be done using conventions where possible
to minimise amount of boilerplate code.

```js
function handleChange(e) {
  setResource({ ...resource, [e.currentTarget.name]: e.currentTarget.value })
}
return <form onSubmit={handleSubmit}>
  <Input name="name" value={resource.name || ''} onChange={handleChange} />
  <TextArea name="description" fill={true} growVertically={true} placeholder="Description"
    value={resource.description || ''} onChange={handleChange}
  />
</form>
```

In this example `handleChange` method picks up changed field name from
HTML attribute `name`, which is also used by `Input` component to automatically
generate input field label. This allows to specify "name" only once, as well as to
prevent repetition of form group - label - input tags.

## Styling of Components

*TODO:* Global stylesheets vs styled components? Where each of the styles go?

## Notifications

https://blueprintjs.com/docs/#core/components/toast is an excellent
example of clearly implemented notifications.

Other implementation exist.

Use https://github.com/teodosii/react-notifications-component
or create a similar API.

See https://alligator.io/react/react-notifications-component/
for customisation example.

## Implementation Conventions

* Store state in localStorage or sessionStorage rather than cookies
* Use single quotes instead of double: https://bytearcher.com/articles/single-or-double-quotes-strings-javascript/
