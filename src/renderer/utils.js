import * as IconComponents from "@element-plus/icons-vue";

const IconInstaller = (app) => {
  Object.values(IconComponents).forEach(component => {
    app.component(component.name, component)
  })
}

export {
  IconInstaller
}