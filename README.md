# Controlador Solar

Este proyecto contiene un prototipo de dimensionamiento de sistemas fotovoltaicos. Incluye un backend en Flask que lee datos desde un archivo Excel y una interfaz web que consume la información mediante peticiones HTTP.

## Rutas de la API

El backend expone varias rutas JSON para poblar los formularios del frontend. Entre ellas se encuentran las siguientes:

### `/api/metodo_calculo_options`
Devuelve un arreglo de cadenas con los métodos de cálculo de radiación disponibles. Los valores se leen desde la hoja "Tablas" del Excel y normalmente incluyen opciones como "Cielo Isotrópico" o "Cielo Anisotrópico".

### `/api/modelo_metodo_options`
Entrega un arreglo con los modelos asociados al método de cálculo. El frontend filtra estas opciones según la selección anterior: si el usuario elige "Cielo Isotrópico" se muestra únicamente la opción "Método Liu-Jordan"; en otro caso se muestran los modelos restantes.

En la interfaz HTML `calculador.js` consume estas rutas mediante `fetch` para llenar las listas desplegables `metodo-calculo-select` y `modelo-metodo-select`. Al cambiar de método, el script vuelve a solicitar `/api/modelo_metodo_options` y actualiza el segundo desplegable para reflejar las opciones válidas.

