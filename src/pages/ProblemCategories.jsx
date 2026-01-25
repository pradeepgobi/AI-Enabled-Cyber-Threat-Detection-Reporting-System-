import React from "react";
import { Link } from "react-router-dom";
import './ProblemCategories.css';

export default function ProblemCategories() {
  return (
    <div className="problem-categories">
      <div className="categories-container">
        {/* Women / Children Related Problems */}
        <div className="category-card women">
          <h2>Women / Children Related Problems</h2>
          <p>
            These include issues faced by women and children like safety concerns,
            harassment, domestic violence, missing children, child labour and more.
          </p>
          <Link to="/women">
            <button className="button-women">Go to Women Complaint Page</button>
          </Link>
        </div>

        {/* Crime Related Problems */}
        <div className="category-card crime">
          <h2>Crime Related Problems</h2>
          <p>
            Crime-related issues include theft, cybercrime, fraud, illegal activities,
            violence, drug cases and more.
          </p>
          <Link to="/Login">
            <button  className="button-women">Go to Crime Complaint Page</button>
          </Link>
        </div>
      </div>
    </div>
  );
}