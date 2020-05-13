import { useState, useEffect } from 'react'

const useResource = (formId, dataProvider, resourceName, params, options = {}) => {
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
        if (options.onResourceLoaded)
          options.onResourceLoaded({ form: form })
      })
    }
  })

  return resource;
}

/**
 * Transforms parameters list to a JSON-friendly object
 * 
 * @param {array} params
 */
const paramsToData = (params) => {
  const data = {}
  for (let param of params) {
    if (param.name.substring(param.name.length - 2) !== '[]') {
      data[param.name] = param.value 
    } else { // transform list into an array
      const actual_name = param.name.substring(0, param.name.length - 2)
      if (!data[actual_name])
        data[actual_name] = []
      data[actual_name].push(param.value)
    }
  }
  return data
}

/**
 * Creates or saves JS object
 * 
 * @param {object} data Arbitrary JSON-serializable object with data 
 * @param {*} dataProvider 
 * @param {string} resourceName Name of the resource in API
 */
const persistData = (data, dataProvider, resourceName) => {
  const update = data.id ?
    dataProvider('UPDATE', resourceName, { id: data.id, data }) :
    dataProvider('CREATE', resourceName, { data })
  return update
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
  const params = []
  for (let i = 0; i < form.elements.length; i++) {
    const element = form.elements[i]
    if (element.name && !element.disabled) // warning: this passes empty parameters, may not be suitables for passwords etc
      if (element.checked || ['radio', 'checkbox', 'submit'].indexOf(element.type) === -1) {
        params.push({name: element.name, value: element.value})
      }
  }
  const data = paramsToData(params)
  return persistData(data, dataProvider, resourceName)
}

export { useResource, persistData, persistForm }
