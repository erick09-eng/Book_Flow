/* Configuración de servicios externos. Pega aquí tus claves (ver instrucciones en la explicación). */
window.BOOKFLOW_CONFIG = {
  // Inicio de sesión con Google: ID de cliente OAuth tipo "Aplicación web"
  GOOGLE_CLIENT_ID: '',            // ej: '1234567890-abc123.apps.googleusercontent.com'

  // Envío de correos para recuperar la contraseña (EmailJS)
  EMAILJS: {
    serviceId: '',                 // ej: 'service_xxxxxxx'
    templateId: '',                // ej: 'template_xxxxxxx'
    publicKey: '',                 // ej: 'AbCdEfGhIjKlMnOp'
  },

  // Configuración de Supabase
  SUPABASE: {
    url: 'https://bdjwpdwlheocnenszprh.supabase.co',      // Tu Project URL de Supabase
    anonKey: 'sb_publishable_XeMvR31qNv_JNiwoD_Rr5w_47Lresro',            // Tu anon/public key de Supabase
  },

  // API de libros: datos de libros-programacion-gratis (midudev) embalados en JSON local.
  BOOKS_API: {
    baseUrl: '../js/service/libros-api.json',
    coversUrl: '',
  }
};

// Inicializar la instancia del cliente Supabase si el CDN de Supabase está cargado en el HTML
if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(
    window.BOOKFLOW_CONFIG.SUPABASE.url,
    window.BOOKFLOW_CONFIG.SUPABASE.anonKey
  );
}