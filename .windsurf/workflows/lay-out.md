---
description: Como es el layout de las paginas 
---

Este seria un ejemplo de layout con barra lateral , contenedor ala derecha y footer: 
<main
  class="relative flex-1 overflow-auto"
  style="--sidebar-width: 16rem; margin-left: var(--sidebar-width); width: calc(100% - var(--sidebar-width)); transition: all 0.3s ease-in-out;">
  
  <div class="container px-4 py-8 pb-32 mx-auto">
    <!-- contenido scrollable -->
  </div>

  <footer
    class="fixed bottom-0 right-0 z-40 flex justify-end p-4 transition-all duration-300 bg-white border-t shadow"
    style="left: var(--sidebar-width); width: calc(100% - var(--sidebar-width));">
    <!-- contenido del footer -->
    <button class="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700">Guardar</button>
  </footer>
</main>

Los botones del footer siempre deben aparecer como flotando , sin una barra , los botones estaran fijos y flotando y siempre todo el layout responsive , teniendo en cuenta que si se despliega la barra lateral se ajusta el tamaño del contenedor de la derecha y el footer , es un layot clasico , la separacion del footer a la derecha es para que si el contenido del contendor principal se desborda los botones del footer siempre esten fijos y el scroll pase por debajo de los botones. 