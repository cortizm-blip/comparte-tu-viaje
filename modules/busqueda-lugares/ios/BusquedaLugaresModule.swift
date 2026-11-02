// Búsqueda de lugares por nombre con Apple Maps (MKLocalSearch), acotada a Santiago.
// A diferencia del geocodificador de direcciones, encuentra estaciones de metro y otros puntos de interés.
import ExpoModulesCore
import MapKit

private let centroSantiago = CLLocationCoordinate2D(latitude: -33.45, longitude: -70.66)
private let radioMetros: CLLocationDistance = 40_000
private let maxResultados = 5

public class BusquedaLugaresModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BusquedaLugares")

    // Devuelve hasta 5 lugares que coinciden con el texto: nombre, dirección, lat y lng.
    AsyncFunction("buscarLugares") { (texto: String, promise: Promise) in
      let pedido = MKLocalSearch.Request()
      pedido.naturalLanguageQuery = texto
      pedido.region = MKCoordinateRegion(center: centroSantiago, latitudinalMeters: radioMetros, longitudinalMeters: radioMetros)
      MKLocalSearch(request: pedido).start { respuesta, error in
        if let error = error as? MKError, error.code == .placemarkNotFound {
          return promise.resolve([[String: Any]]())
        }
        if let error {
          return promise.reject("ERR_BUSQUEDA", error.localizedDescription)
        }
        let lugares = (respuesta?.mapItems ?? []).prefix(maxResultados).map { item -> [String: Any] in
          let c = item.placemark.coordinate
          return [
            "nombre": item.name ?? texto,
            "direccion": direccion(item.placemark) as Any,
            "lat": c.latitude,
            "lng": c.longitude,
          ]
        }
        promise.resolve(Array(lugares))
      }
    }
  }
}

// Calle, número y comuna en una línea, o nil si no hay datos.
private func direccion(_ p: MKPlacemark) -> String? {
  let calle = [p.thoroughfare, p.subThoroughfare].compactMap { $0 }.joined(separator: " ")
  let partes = [calle, p.locality ?? ""].filter { !$0.isEmpty }
  return partes.isEmpty ? nil : partes.joined(separator: ", ")
}
