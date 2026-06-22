import { Component } from "inferno";
import { Link } from "inferno-router";
import { MyUserInfo } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon } from "./icon";
import { CommunityLink } from "../community/community-link";

interface NavRailProps {
  myUserInfo?: MyUserInfo;
}

export class NavRail extends Component<NavRailProps> {
  render() {
    const follows = this.props.myUserInfo?.follows ?? [];
    return (
      <nav className="nav-rail d-none d-lg-block">
        <ul className="list-unstyled mb-0">
          <li>
            <Link className="nav-rail__link" to="/">
              <Icon icon="house" classes="me-2" />
              Home
            </Link>
          </li>
          <li>
            <Link className="nav-rail__link" to="/communities">
              <Icon icon="globe" classes="me-2" />
              {I18NextService.i18n.t("communities")}
            </Link>
          </li>
          {this.props.myUserInfo && (
            <li>
              <Link className="nav-rail__link" to="/inbox">
                <Icon icon="bell" classes="me-2" />
                {I18NextService.i18n.t("inbox")}
              </Link>
            </li>
          )}
        </ul>
        {follows.length > 0 && (
          <>
            <hr />
            <div className="nav-rail__heading text-uppercase small text-muted px-2 mb-1">
              {I18NextService.i18n.t("subscribed")}
            </div>
            <ul className="list-unstyled mb-0">
              {follows.map(cfv => (
                <li className="nav-rail__community" key={cfv.community.id}>
                  <CommunityLink community={cfv.community} />
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>
    );
  }
}
