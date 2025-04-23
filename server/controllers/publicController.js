const UserModel = require("../models/Users");
const axios = require('axios');

const searchUsers = async(req, res) => {
    try{
      const query = req.query.query;
      if (!query) return res.json([]);

      const users = await UserModel.find({
          $or: [
              {username: { $regex: query, $options: "i" } },
              { name: { $regex: query, $options: "ix" }},
          ],
      }).limit(10).select("username name");

      res.json(users);

    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Server Search Failed"})
    }
};

const viewUser = async (req, res) => {
    try {
        const identifier = req.params.username;
        console.log("Looking up user with identifier:", identifier);
        
        // Check if the identifier is a valid MongoDB ObjectId
        const ObjectId = require('mongoose').Types.ObjectId;
        const isValidObjectId = ObjectId.isValid(identifier);
        
        // Build query based on whether identifier might be an ObjectId
        let query = { username: identifier };
        if (isValidObjectId) {
          query = { $or: [{ username: identifier }, { _id: identifier }] };
        }
        
        const user = await UserModel.findOne(query).select("-password -__v");
        
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        
        console.log("Found user:", user);
        res.json(user);
        
      } catch (err) {
        console.error("Error in viewUser:", err);
        res.status(500).json({ error: "Failed to get user object", details: err.message });
      }
  };


  const searchLocations = async (req, res) => {
    try {
      const rawQuery = req.query.query.trim().toLowerCase();
      if (!rawQuery) return res.json([]);
  
      const response = await axios.get('https://secure.geonames.org/searchJSON', {
        params: {
          q: rawQuery,
          maxRows: 100,
          username: 'javabek',
          featureClass: ['A', 'P'], 
          style: 'FULL',
          orderby: 'relevance'
        }
      });
  
      const formatLabel = (location, query) => {
        // Remove regions completely
        if (location.fcl === 'L' || location.fcode === 'RGN') return null;
        
        const isCountry = location.fcode === 'PCLI';
        const isProvince = location.fcode.startsWith('ADM1');
        
        if (isCountry) return location.countryName;
      
        const parts = [];
        parts.push(location.name);
      
        // Add adminName1 only for non-province entries
        if (location.adminName1 && !isProvince) {
          parts.push(location.adminName1);
        }
      
        // Always add country name last unless already present
        const countryAlreadyIncluded = parts.some(p => p === location.countryName);
        if (!isCountry && !countryAlreadyIncluded) {
          parts.push(location.countryName);
        }
      
        return parts.join(", ");
      };
  
      const processed = response.data.geonames
      .map(location => {

        const isCountry = location.fcode === 'PCLI';
        const isStateProvince = location.fcode.startsWith('ADM1');
        const isCity = location.fcode.startsWith('PPL');
        const isCapital = location.fcode === 'PPLC';

        const exactMatch = location.name.toLowerCase() === rawQuery.toLowerCase();
        const queryIsState = rawQuery.match(/(state|province|region)/i);
    
        // Combined scoring system
        let score = 0;
        score += isCountry ? 5000 : 0;
        score += isStateProvince ? 2000 : 0;
        score += isCapital ? 5000 : 0;
        score += isCity ? 3000 : 0;
        score += exactMatch ? 4000 : 0;
        score += (location.population / 10000) || 0;
        score += location.population > 1000000 ? 6000 : 0;

        score -= queryIsState && !isStateProvince ? 5000 : 0;
        
        // Penalize non-country entries with country name
        if (location.name && location.countryName) {
          score -= (location.name.toLowerCase() === location.countryName.toLowerCase() && !isCountry) 
            ? 10000 
            : 0;
        }
    
        return {
          ...location,
          score,
          type: isCountry ? 'country' : 
               isStateProvince ? 'province' : 
               isCity ? 'city' : 'other'
        };
      })
      .sort((a, b) => b.score - a.score)
      .map(location => ({
        id: location.geonameId,
        label: formatLabel(location, rawQuery),
        type: location.type,
        original: location
      }))
      .filter(item => item.label)
      .filter(item => item.label.toLowerCase().includes(rawQuery.toLowerCase()))
      .reduce((acc, current) => {
        const exists = acc.some(item => item.label === current.label);
        if (!exists) acc.push(current);
        return acc;
      }, [])
      .slice(0, 7);
  
      res.json(processed);
    } catch (err) {
      console.error('Search error:', err);
      res.status(500).json({ message: "Location search failed", error: err.message });
    }
  };


module.exports = { searchUsers, viewUser, searchLocations }