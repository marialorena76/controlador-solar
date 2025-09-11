import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
import numpy as np

# Matplotlib podría necesitar un backend no interactivo en este entorno
matplotlib.use('Agg')

def generar_informe():
    """
    Lee los datos del archivo Excel, genera un informe de texto
    y crea un gráfico de barras.
    """
    # --- 1. LECTURA DE DATOS ---
    file_path = 'backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'
    sheet_name = 'Resultados'
    try:
        df = pd.read_excel(
            file_path,
            sheet_name=sheet_name,
            header=None,
            skiprows=2,
            usecols='B:J',
            nrows=54
        )
    except Exception as e:
        print(f"No se pudo leer el archivo Excel. Error: {e}")
        return

    # --- 2. EXTRACCIÓN DE DATOS CLAVE ---
    # Usamos .iloc[fila, columna] para acceder a los datos.
    # Se añade un bloque try-except por si alguna celda no tiene el formato esperado.
    try:
        consumo_anual = float(df.iloc[4, 1])
        unidad_consumo = df.iloc[4, 2]

        generacion_anual = float(df.iloc[5, 1])
        unidad_generacion = df.iloc[5, 2]

        paneles_cantidad = int(df.iloc[14, 1])
        panel_potencia = int(df.iloc[12, 1])
        panel_modelo = df.iloc[13, 1]

        inversor_modelo = df.iloc[18, 1]

        emisiones_evitadas = float(df.iloc[47, 1])

    except (ValueError, TypeError, IndexError) as e:
        print(f"Error al procesar los datos de la tabla. Verifica que el formato es correcto. Error: {e}")
        return

    # --- 3. REDACCIÓN DEL INFORME PARA USUARIO BÁSICO ---
    informe_texto = f"""
INFORME DE ESTIMACIÓN DE GENERACIÓN FOTOVOLTAICA

¡Hola! Aquí tienes un resumen sencillo de los resultados de tu estudio solar:

**1. Balance Energético Anual**

Hemos comparado la energía que consumes actualmente con la que podrían generar tus paneles solares.

- **Consumo Anual de Energía:** Actualmente, tu consumo es de **{consumo_anual:.2f} {unidad_consumo}**.
- **Generación Solar Estimada:** Con la instalación propuesta, podrías generar **{generacion_anual:.2f} {unidad_generacion}**.

**Conclusión del balance:** ¡Excelentes noticias! El sistema solar proyectado no solo cubre el 100% de tu consumo, sino que además genera un excedente de energía que se inyectará a la red eléctrica.

**2. Detalles de la Instalación Recomendada**

Para lograr esta generación, te recomendamos la siguiente configuración:

- **Paneles Solares:** Se necesita **{paneles_cantidad} panel solar**.
- **Modelo Sugerido:** El panel recomendado es el modelo **{panel_modelo}** de **{panel_potencia} W** de potencia.
- **Inversor:** Se sugiere un inversor modelo **{inversor_modelo}**.

**3. Impacto Ambiental**

Al usar energía solar, ayudas al planeta.

- **Reducción de Emisiones:** Con esta instalación, evitarás la emisión de aproximadamente **{emisiones_evitadas:.2f} toneladas de CO2** a la atmósfera cada año.

**Sobre los Gráficos:**
- He generado un gráfico de barras para que veas visualmente la comparación entre tu consumo y la generación solar. Lo encontrarás en el archivo `grafico_comparativo.png`.
- La información actual es un resumen anual, por lo que no es posible generar un gráfico detallado por meses o un desglose de tus consumos (gráfico circular).

Esperamos que este informe te sea de gran utilidad.
"""

    print(informe_texto)

    # --- 4. GENERACIÓN DE GRÁFICO DE BARRAS ---
    try:
        labels = ['Consumo Anual', 'Generación Estimada']
        valores = [consumo_anual, generacion_anual]

        plt.figure(figsize=(8, 6))
        bars = plt.bar(labels, valores, color=['#ff9999','#66b3ff'])
        plt.ylabel(f'Energía ({unidad_consumo})')
        plt.title('Comparativa: Consumo Anual vs. Generación Solar Estimada')
        plt.grid(axis='y', linestyle='--', alpha=0.7)

        # Añadir etiquetas con los valores encima de las barras
        for bar in bars:
            yval = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2.0, yval, f'{yval:.2f}', va='bottom', ha='center')

        # Guardar el gráfico
        nombre_archivo_grafico = 'grafico_comparativo.png'
        plt.savefig(nombre_archivo_grafico)
        print(f"\nGráfico guardado correctamente como '{nombre_archivo_grafico}'.")

    except Exception as e:
        print(f"No se pudo generar el gráfico. Error: {e}")


if __name__ == "__main__":
    generar_informe()
