import { Component } from "inferno";

interface MainLayoutProps {
  children?: any;
  sidebar?: any;
  navRail?: any;
}

export class MainLayout extends Component<MainLayoutProps> {
  render() {
    return (
      <div className="main-layout container-lg">
        {this.props.navRail}
        <div className="main-layout__content">{this.props.children}</div>
        {this.props.sidebar && (
          <aside className="main-layout__sidebar d-none d-md-block">
            {this.props.sidebar}
          </aside>
        )}
      </div>
    );
  }
}
