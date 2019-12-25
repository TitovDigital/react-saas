import { useState, useEffect } from 'react'

const useResource = (formId, dataProvider, resourceName, params) => {
  const [resourceFetched, setResourceFetched] = useState()
  const [resource, setResource] = useState({})

  useEffect(() => {
    const form = document.getElementById(formId)

    if (!resourceFetched) {
      setResourceFetched(true)
      dataProvider('GET_ONE', resourceName, params).then(response => {
        setResource(response.data)
        for (const field in response.data) {
          if (form.elements[field]) {
            form.elements[field].value = response.data[field]
          }
        }
      })
    }
  })

  return resource;
}

/**
 * Creates or saves object from form fields
 * 
 * If `id` is present a new object is created; otherwise existing is updated by id
 * 
 * @param {HTMLFormElement} form Form to serialize
 * @param dataProvider
 * @param {string} resourceName Name of the resource in API
 */
const persistForm = (form, dataProvider, resourceName) => {
  const data = {}
  for (let i = 0; i < form.elements.length; i++) {
    const element = form.elements[i]
    if (element.name) // warning: this passes empty parameters, may not be suitables for passwords etc
      data[element.name] = element.value
  }
  const update = data.id ?
    dataProvider('UPDATE', resourceName, { id: data.id, data }) :
    dataProvider('CREATE', resourceName, { data })
  return update
}

export { useResource, persistForm }
