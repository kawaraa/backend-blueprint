// This module acts as an observer interested in changes to the shopping cart

class ShoppingCartObserver {
  update(data) {
    console.log("Observer 1 received data:", data);
  }
}
