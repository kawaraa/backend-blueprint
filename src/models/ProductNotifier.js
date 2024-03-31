// This module acts as the subject in the Observer pattern. It notifies observers about changes in product availability.

// Subject (or Observable)
class ProductNotifier {
  constructor() {
    this._name = "product name";
    this.observers = [];
  }

  // Method to register observers
  addObserver(observer) {
    this.observers.push(observer);
  }

  // Method to remove observers
  removeObserver(observer) {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  // Method to notify observers
  notify(data) {
    this.observers.forEach((observer) => observer.update(data));
  }

  set name(value) {
    this._name = value;
    this.notify({ property: "name", value });
  }

  get name() {
    return this._name;
  }
}

module.exports = ProductNotifier;
