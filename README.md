# React.JS SaaS Patterns

This document describes best patterns for developing
SPA back-office and SaaS applications.

Rather than a module or a blueprint, it is a set of principles
and conventions that streamline development of SPA
applications.

## The Core Principles

1. Separation of component view and data without using heavyweight
Flux/Redux approach.
2. Use of standard APIs such as JSON CRUD and JWT Bearer instead of
vendor-specific whenever possible.
3. Convention over dependency. Reliance on documented conventions
to reduce code dependencies whenever possible.

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

### Data and State

Global state that needs to be shared between components should be maintained
using standard practices:
* when the data fetched from a server need to be accessible in several components,
  [SWR](https://swr.vercel.app/) can be used to do so
* in more general cases, [React Context](https://react.dev/learn/passing-data-deeply-with-context) can be suitable

Sometimes, [singleton pattern](https://en.wikipedia.org/wiki/Singleton_pattern) is an acceptable method of keeping global state.
Blueprint.js [Toaster component](https://blueprintjs.com/docs/#core/components/toast)
is an example of how it works.

### Back-End Abstraction

In many cases, it's practical to create an abstraction around a simple fetch,
transforming CRUD data requests from JS components into HTTP requests to the back-end.

Conceptually, it can be split into two layers:
1. a Fetcher, that works with requests specified in [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)-like
  way, abstracting underlying HTTP communications and authentication,
  but still requiring to provide URI, request parameters etc
2. optionally, Data Provider that implements even a higher-level way of accessing data

The reference application uses a [`simpleRestProvider`](samples/simpleRestProvider.js), which
is based on `ra-data-simple-rest` [React Admin Data Provider](https://marmelab.com/react-admin/DataProviders.html),
however the interface has been modified to remove data provider function dependency on react-admin.

> In most cases with REST APIs `httpClient` should be used directly without a data provider level,
> unless application requirements include being able to switch between various APIs. For non-REST
> API a vendor JS SDK library is preferred to the custom implementation.
>
> Alternatively, a client application
> may implement models using ActiveRecord pattern to provide an API-agnostic layer for data access.
> This is most useful when a single model may have data coming from several back-end services.

In the reference application,
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

## UI/UX Considerations

To reduce visual flicker during loading of data used by individual page components, consider:
* for components that have known dimensions and wouldn't affect flow,
  hiding the intermediary states with `visibility: hidden` until all data needed for rendering
  are present
* for components that have unknown dimensions, or components that can be grouped logically,
  postpone rendering of the component _and_ components located further on the page until
  it can be rendered in its final state

## Notifications

https://blueprintjs.com/docs/#core/components/toast is an excellent
example of clearly implemented notifications.

Other implementation exist.

Use https://github.com/teodosii/react-notifications-component
or create a similar API.

See https://alligator.io/react/react-notifications-component/
for customisation example.

## Implementation Conventions

* Locate 'controller' code that doesn't depend on React outside of functional components,
  but possibly in the same file
* Store state in localStorage or sessionStorage rather than cookies
* Use single quotes instead of double: https://bytearcher.com/articles/single-or-double-quotes-strings-javascript/
