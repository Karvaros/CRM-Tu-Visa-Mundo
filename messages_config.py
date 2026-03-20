from datetime import datetime, timedelta

# Intervalos de días desde el Día 0 para cada paso
DRIP_DAYS_REGISTRO = [0, 1, 4, 10, 20, 40]
DRIP_DAYS_PERFIL = [0, 2, 8, 20, 30, 45, 60]

def get_next_business_day(date_obj):
    """Si la fecha cae en fin de semana, la mueve al lunes siguiente."""
    if date_obj.weekday() == 5: # Sábado
        return date_obj + timedelta(days=2)
    elif date_obj.weekday() == 6: # Domingo
        return date_obj + timedelta(days=1)
    return date_obj

def get_drip_message(destino, step, asesor_name="Augusto"):
    """
    Retorna el mensaje correspondiente según el destino (Canadá, EEUU, Reino Unido, etc.) y el paso (0, 1, 2, 3, 4, 5).
    """
    # Determinar destino
    d_up = str(destino).upper()
    is_eeuu = ("EE" in d_up or "ESTADOS UNIDOS" in d_up)
    is_uk = ("REINO" in d_up or "UK" in d_up or "UNITED KINGDOM" in d_up)
    is_au = ("AUSTRALIA" in d_up or "AUS" in d_up)
    
    if is_eeuu:
        destino_name = "EEUU"
        bandera = "🇺🇸"
    elif is_uk:
        destino_name = "Reino Unido"
        bandera = "🇬🇧"
    elif is_au:
        destino_name = "Australia"
        bandera = "🇦🇺"
    else:
        destino_name = "Canadá"
        bandera = "🇨🇦"
    
    # 0: Bienvenida (Día 0)
    if step == 0:
        return f"¡Hola! Soy {asesor_name} de *Tu Visa Mundo*. Recientemente te registraste en nuestro sitio web por tu interés en solicitar la *visa de turismo a {destino_name}* {bandera}.\n\nHemos ayudado a cientos de viajeros como tú a obtener su visa, incluso en casos que parecían complicados.\n\nIndícanos por favor *cuántos planean aplicar a la visa y qué relación tienen* (Pareja, padres e hijos, amigos, etc.)"
    
    # 1: Recordatorio (Día 1)
    elif step == 1:
        if is_eeuu:
            return f"¡Hola 👋🏼! Espero que estés bien.\n\n¿Sabías que puedes realizar tu Estudio de Perfil en linea sin costo?. Así sabrás de primera mano si tu perfil es o no aplicable para la visa de turismo.\nSolo te tomará un minuto. Ingresa al siguiente link y responda algunas preguntas. En breve recibirás en tu correo la respuesta a tu Estudio de Perfil: https://www.tuvisamundo.com/estudio-de-perfil-en-linea/"
        else:
            return f"¡Hola 👋🏼! Espero que estés bien.\n\n¿Sabías que puedes realizar tu Estudio de Perfil en linea sin costo?. Así sabrás de primera mano si tu perfil es o no aplicable para la visa de turismo.\nSolo te tomará un minuto. Ingresa al siguiente link y responda algunas preguntas. En breve recibirás en tu correo la respuesta a tu Estudio de Perfil: https://www.tuvisamundo.com/estudio-de-perfil-en-linea/"
            
    # 2: Video (Día 4)
    elif step == 2:
        if is_eeuu:
            return f"Hola 🙋🏻. La mayoría de la gente piensa que la aprobación de la visa de EE.UU. 🇺🇸 depende de la entrevista, y es cierto. Pero el secreto no es la suerte, es la preparación.\n\nIngresa a nuestro sitio web y conoce los pasos del *Trámite y asesoría*. Así tendrás total claridad sobre los tiempos de procesamiento y los costos.\n\nÉchale un vistazo: https://www.tuvisamundo.com/visa-de-turismo-canada-v2/\n\nSi después de verlo tienes alguna pregunta en concreto hazmelo saber."
        elif is_uk:
            return f"Hola 🙋🏻. Sé que a veces el proceso de una visa puede parecer intimidante, especialmente la idea de una \"cita\" en la embajada.\n\n¿Sabías que para la visa de Reino Unido 🇬🇧 *no hay una entrevista consular*? Es solo una cita rápida para tomar tus huellas y una foto.\n\nIngresa a nuestro sitio web y conoce los pasos del *Trámite y asesoría*. Así tendrás total claridad sobre los tiempos de procesamiento y los costos: \n\nÉchale un vistazo: https://www.tuvisamundo.com/visa-de-turismo-reino-unido-v2/\n\nSi después de verlo tienes alguna pregunta en concreto hazmelo saber."
        elif is_au:
            return f"Hola 🙋🏻. Sé que a veces el proceso de una visa puede parecer intimidante, especialmente la idea de una \"cita\" en la embajada.\n\n¿Sabías que para la visa de Australia 🇦🇺 *no hay una entrevista consular*? Es solo una cita rápida para tomar tus huellas y una foto.\n\nIngresa a nuestro sitio web y conoce los pasos del *Trámite y asesoría*. Así tendrás total claridad sobre los tiempos de procesamiento y los costos: \n\nÉchale un vistazo: https://www.tuvisamundo.com/visa-de-turismo-canada-v2/\n\nSi después de verlo tienes alguna pregunta en concreto hazmelo saber."
        else:
            return f"Hola 🙋🏻. Sé que a veces el proceso de una visa puede parecer intimidante, especialmente la idea de una \"cita\" en la embajada.\n\n¿Sabías que para la visa de Canadá *no hay una entrevista consular*? Es solo una cita rápida para tomar tus huellas y una foto.\n\nIngresa a nuestro sitio web y conoce los pasos del *Trámite y asesoría*. Así tendrás total claridad sobre los tiempos de procesamiento y los costos: \n\nÉchale un vistazo: https://www.tuvisamundo.com/visa-de-turismo-canada-v2/\n\nSi después de verlo tienes alguna pregunta en concreto hazmelo saber."
            
    # 3: Testimonios (Día 10)
    elif step == 3:
        return f"Hola ¿cómo estás?, sé que elegir una agencia es una decisión de confianza. Por eso, en lugar de contarte yo lo bueno que es nuestro servicio, prefiero que lo veas a través de los ojos de otros clientes.\n\nTe invito a ver algunas de sus experiencias aquí: https://www.tuvisamundo.com/testimonios/"
        
    # 4: Blog (Día 20)
    elif step == 4:
        if is_eeuu:
            return f"Hola, te saluda {asesor_name} de _Tu Visa Mundo_.\n\nDespués de ayudar a cientos de personas con su visa de EE.UU. 🇺🇸, he identificado un patrón claro en las preguntas que hacen los oficiales consulares.\n\nPara compartir este conocimiento, publiqué un 'Test' en mi blog que simula la entrevista. Te permitirá practicar tus respuestas y entender exactamente qué es lo que los cónsules quieren saber.\n\nAquí lo tienes: https://www.tuvisamundo.com/test-para-la-entrevista-de-la-visa-americana/"
        elif is_uk:
            return f"Hola ¿cómo estás? Te saluda {asesor_name} de *Tu Visa Mundo*.\n\nPensando en tu interés por la *visa de turismo a Reino Unido 🇬🇧*, quería compartirte un recurso sobre una de las partes más importantes (y que más se suelen descuidar) de la solicitud: *la Carta de Intención de Viaje*.\n\nMuchos aplicantes no saben qué poner, así que creé esta guía completa que explica cómo escribirla paso a paso. Una buena carta puede marcar la diferencia en la aprobación.\n\nAquí la tienes: https://www.tuvisamundo.com/guia-carta-de-intencion-de-viaje-reino-unido/\n\nEspero que te sea de mucha utilidad."
        elif is_au:
            return f"Hola ¿cómo estás? Te saluda {asesor_name} de *Tu Visa Mundo*.\n\nPensando en tu interés por la *visa de turismo a Australia 🇦🇺*, quería compartirte un recurso sobre una de las partes más importantes (y que más se suelen descuidar) de la solicitud: *la Carta de Intención de Viaje*.\n\nMuchos aplicantes no saben qué poner, así que creé esta guía completa que explica cómo escribirla paso a paso. Una buena carta puede marcar la diferencia en la aprobación.\n\nAquí la tienes: https://www.tuvisamundo.com/guia-carta-de-intencion-de-viaje-canada/\n\nEspero que te sea de mucha utilidad."
        else:
            return f"Hola ¿cómo estás? Te saluda {asesor_name} de *Tu Visa Mundo*.\n\nPensando en tu interés por la *visa de turismo a Canadá 🇨🇦*, quería compartirte un recurso sobre una de las partes más importantes (y que más se suelen descuidar) de la solicitud: *la Carta de Intención de Viaje*.\n\nMuchos aplicantes no saben qué poner, así que creé esta guía completa que explica cómo escribirla paso a paso. Una buena carta puede marcar la diferencia en la aprobación.\n\nAquí la tienes: https://www.tuvisamundo.com/guia-carta-de-intencion-de-viaje-canada/\n\nEspero que te sea de mucha utilidad."
            
    # 5: Artículo Perfil (Día 40)
    elif step == 5:
        if is_uk:
            return f"Hola, espero que estés bien.\n\nEl diario *Perfil* nos incluyó en su Guía de Profesionales para hablar sobre las claves para obtener visas a destinos como Reino Unido 🇬🇧, EE.UU. y Australia.\n\nComo en su momento mostraste interés en el tema, pensé que la perspectiva de un medio internacional podría resultarte valiosa.\n\nPuedes leer la nota completa aquí: https://www.perfil.com/noticias/guia-de-profesionales-pnt/guia-completa-para-obtener-una-visa-en-estados-unidos-reino-unido-y-australia.phtml\n\n¡Saludos!"
        elif is_au:
            return f"Hola, espero que estés bien.\n\nEl diario *Perfil* nos incluyó en su Guía de Profesionales para hablar sobre las claves para obtener visas a destinos como Australia, EE.UU. y Canadá.\n\nComo en su momento mostraste interés en el tema, pensé que la perspectiva de un medio internacional podría resultarte valiosa.\n\nPuedes leer la nota completa aquí: https://www.perfil.com/noticias/guia-de-profesionales-pnt/guia-completa-para-obtener-una-visa-en-estados-unidos-canada-y-australia.phtml\n\n¡Saludos!"
        else:
            return f"Hola, espero que estés bien.\n\nEl diario *Perfil* nos incluyó en su Guía de Profesionales para hablar sobre las claves para obtener visas a destinos como Canadá, EE.UU. y Australia.\n\nComo en su momento mostraste interés en el tema, pensé que la perspectiva de un medio internacional podría resultarte valiosa.\n\nPuedes leer la nota completa aquí: https://www.perfil.com/noticias/guia-de-profesionales-pnt/guia-completa-para-obtener-una-visa-en-estados-unidos-canada-y-australia.phtml\n\n¡Saludos!"
        
    return ""

def get_drip_message_perfil(perfil_name, step, asesor_name="Augusto"):
    """
    Retorna el mensaje correspondiente según el nivel de perfil (Alto, Medio Alto, Medio, etc.) y el paso.
    """
    p_up = str(perfil_name).upper()
    is_medio = ("MEDIO" in p_up and "ALTO" not in p_up) # Captura solo Medio, no Medio-Alto
    
    # 0: Bienvenida (Día 0)
    if step == 0:
        return f"¡Hola! Soy {asesor_name} de *Tu Visa Mundo*. Recientemente te registraste en nuestro sitio web por tu interés en solicitar la *visa de turismo a Canadá* 🇨🇦.\n\nHemos ayudado a cientos de viajeros como tú a obtener su visa, incluso en casos que parecían complicados.\n\nIndícanos por favor *cuántos planean aplicar a la visa y qué relación tienen* (Pareja, padres e hijos, amigos, etc.)"
        
    # 1: Video Perfil (Día 2)
    elif step == 1:
        if is_medio:
            return f"¡Hola! Quería recordarte que tu perfil califica como *Medio*. Esto significa que es un perfil con potencial que, con nuestra asesoría, podemos trabajar para hacerlo mucho más robusto.\n\nPara que veas cómo funciona, aquí te dejo un video corto que explica nuestro proceso de trabajo: https://youtu.be/oxR66LehHlc"
        else:
            return f"¡Hola! Quería recordarte que tu perfil califica como *Alto* / *Medio-Alto*, lo que significa que tienes excelentes probabilidades de aprobación para tu visa.\n\nPara que veas lo simple que es el siguiente paso, aquí te dejo un video corto que explica exactamente cómo iniciamos el proceso: https://youtu.be/oxR66LehHlc"
            
    # 2: Testimonios (Día 8)
    elif step == 2:
        return f"Hola ¿cómo estás?, sé que elegir una agencia es una decisión de confianza. Por eso, en lugar de contarte yo lo bueno que es nuestro servicio, prefiero que lo veas a través de los ojos de otros clientes.\n\nTe invito a ver algunas de sus experiencias aquí: [Link web]"
        
    # 3: Reel Errores (Día 20)
    elif step == 3:
        return f"Una pregunta que suelen hacerme: '{asesor_name}, ¿cuál es la diferencia entre hacerlo solo y con tu asesoría?'. La respuesta está en los detalles que evitan un rechazo...\n\nEn este Reel te muestro los 3 errores más comunes que la gente comete al aplicar. ¡Espero que te sirva!: [Link Instagram]"
        
    # 4: Oferta (Día 30)
    elif step == 4:
        return f"Hola, Espero que estés bien.\n\nTe contacto para informarte sobre una oportunidad única. Por tiempo limitado estamos ofreciendo un *beneficio especial* para todos los aplicantes que, como tú, ya realizaron su estudio de perfil y fueron calificados como perfiles aptos.\n\nSe trata de un descuento del 25% sobre el valor total de nuestra asesoría para el trámite de tu visa.\n\nEsta oferta finaliza el **. Si estás pensando en avanzar con tu proceso, es un excelente momento para hacerlo.\n\nAvísame si te interesa y te envío los detalles para comenzar."
        
    # 5: Caso Especial (Día 45)
    elif step == 5:
        return f"Buenos días, ¿cómo estás?\n\nEn nuestro trabajo, a menudo gestionamos casos con complicaciones inesperadas. Quiero compartirte uno en particular que ilustra bien este punto: el de Ana y su hija.\n\nSu solicitud de visa para CANADÁ enfrentó demoras atípicas y un rechazo inicial que, tras nuestra intervención, fue revertido. Finalmente, con una nueva aplicación y la estrategia correcta, obtuvieron la aprobación.\n\nLa historia completa está en este video. Es un excelente ejemplo de cómo un enfoque metódico puede superar obstáculos complejos.\n\n[Link Youtube]"
        
    # 6: Ofrecer Plan Basic (Día 60)
    elif step == 6:
        return f"Hola, ¿Cómo vas?\n\nMuchos de nuestros clientes con perfiles excelentes como el tuyo, buscan la forma más inteligente de invertir en su trámite: quieren la máxima seguridad sin pagar por servicios que quizás no necesitan.\n\nPrecisamente por eso, creé una página que compara lado a lado nuestro *Servicio Premium* y nuestro *Servicio Basic*.\n\nTe invito a que la revises. Podrás ver exactamente qué incluye cada uno y cómo puedes *ahorrar hasta un 35%* eligiendo el plan que mejor se adapta a ti.\n\nhttps://www.tuvisamundo.com/elige-tu-plan/\n\nAvísame qué te parece o si te surge alguna duda al verla. ¡Saludos!"
        
    return ""
